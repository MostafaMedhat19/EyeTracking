import { appendFileSync, readFileSync } from 'node:fs';
import { classifyPullRequest } from './classify-pr.mjs';
import { evaluateMergeGuards } from './merge-guards.mjs';
import { collectPages, evaluateRequiredChecks, resolveAssociatedPullRequest } from './github-state.mjs';

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const workflowRun = event.workflow_run;
const decision = { eligible: false, mode: 'dry-run', reasons: [], checkDetails: [] };

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  return response.json();
}

async function rest(path, options) {
  return request(`https://api.github.com/repos/${repository}${path}`, options);
}

async function graphql(query, variables) {
  const payload = await request('https://api.github.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables })
  });
  if (payload.errors?.length) throw new Error(`GitHub GraphQL: ${payload.errors.map((error) => error.message).join('; ')}`);
  return payload.data;
}

async function fetchReviewThreads(owner, name, number) {
  const nodes = [];
  let cursor = null;
  for (let page = 0; page < 50; page++) {
    const data = await graphql(`
      query($owner: String!, $name: String!, $number: Int!, $cursor: String) {
        repository(owner: $owner, name: $name) {
          pullRequest(number: $number) {
            reviewThreads(first: 100, after: $cursor) {
              nodes { isResolved }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      }
    `, { owner, name, number, cursor });
    const threads = data?.repository?.pullRequest?.reviewThreads;
    if (!threads) throw new Error('Review conversations could not be read.');
    nodes.push(...threads.nodes);
    if (!threads.pageInfo.hasNextPage) return nodes;
    if (!threads.pageInfo.endCursor) throw new Error('Review conversation pagination returned no cursor.');
    cursor = threads.pageInfo.endCursor;
  }
  throw new Error('Review conversation pagination exceeded 50 pages.');
}

async function evaluate() {
  if (!token || !repository || !workflowRun) throw new Error('Missing trusted workflow context.');

  const association = await resolveAssociatedPullRequest({
    workflowRun,
    repository,
    fetchPull: (number) => rest(`/pulls/${number}`),
    findPullsForCommit: (sha) => collectPages((page) =>
      rest(`/commits/${sha}/pulls?per_page=100&page=${page}`, {
        headers: { Accept: 'application/vnd.github+json' }
      })
    )
  });
  const { pr, expectedSha, sourceRepositoryMatches } = association;
  decision.pr = pr.number;
  decision.headSha = expectedSha;

  const files = await collectPages((page) => rest(`/pulls/${pr.number}/files?per_page=100&page=${page}`));
  const classification = classifyPullRequest(files);
  decision.classification = classification;

  const checkRuns = await collectPages(async (page) => {
    const response = await rest(`/commits/${expectedSha}/check-runs?per_page=100&page=${page}`);
    return response.check_runs;
  });
  const workflowRuns = await collectPages(async (page) => {
    const response = await rest(`/actions/runs?head_sha=${expectedSha}&event=pull_request&per_page=100&page=${page}`);
    return response.workflow_runs;
  });
  const checks = evaluateRequiredChecks({ checkRuns, workflowRuns, expectedSha });
  decision.checkDetails = checks.details;

  const [owner, name] = repository.split('/');
  const threads = await fetchReviewThreads(owner, name, pr.number);
  decision.reasons.push(...evaluateMergeGuards({
    classification,
    headShaMatches: pr.head.sha === expectedSha,
    sourceRepositoryMatches,
    draft: pr.draft,
    state: pr.state,
    mergeable: pr.mergeable,
    mergeableState: pr.mergeable_state,
    requiredWorkflows: checks.requiredChecks,
    unresolvedThreads: threads.filter((thread) => !thread.isResolved).length,
    allThreadsVerified: true
  }));
}

let evaluationError = null;
try {
  await evaluate();
} catch (error) {
  evaluationError = error;
  decision.reasons.push(`Evaluation failed closed: ${error.message}`);
}

decision.reasons = [...new Set(decision.reasons)];
decision.eligible = decision.reasons.length === 0;
const summary = [
  '# Safe auto-merge decision',
  '',
  '**Mode: DRY RUN — this workflow cannot merge pull requests.**',
  '',
  `**Result:** ${decision.eligible ? 'Would be eligible for squash merge' : 'Held for maintainer review'}`,
  decision.pr ? `**PR:** #${decision.pr}` : '',
  decision.headSha ? `**Verified workflow head:** \`${decision.headSha}\`` : '',
  '',
  '## Required check runs',
  ...(decision.checkDetails.length
    ? decision.checkDetails.map((item) => `- \`${item.check}\` via ${item.workflow}: workflow ${item.workflowStatus}/${item.workflowConclusion}, check ${item.checkStatus}/${item.checkConclusion}`)
    : ['- Required checks could not be verified.']),
  '',
  '## Decision details',
  ...(decision.reasons.length ? decision.reasons.map((reason) => `- ${reason}`) : [
    '- Exact PR head SHA and source repository revalidated.',
    '- Strict file and diff allowlist passed.',
    '- Required check runs succeeded for the exact SHA.',
    '- PR is open, non-draft, mergeable, and has no unresolved review conversations.'
  ]),
  '',
  '> Webcam and real-device behavior are never certified by this automation. Sensitive changes always require maintainer review and relevant real-device testing.'
].filter(Boolean).join('\n');
appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
console.log(JSON.stringify(decision, null, 2));
if (evaluationError) process.exitCode = 1;
