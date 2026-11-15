import { appendFileSync, readFileSync } from 'node:fs';
import { classifyPullRequest } from './classify-pr.mjs';
import { evaluateMergeGuards } from './merge-guards.mjs';

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const workflowRun = event.workflow_run;
const pullRequestRef = workflowRun?.pull_requests?.[0];

const decision = { eligible: false, mode: 'dry-run', reasons: [] };
if (!token || !repository || !workflowRun) decision.reasons.push('Missing trusted workflow context.');
if (!pullRequestRef?.number) decision.reasons.push('No pull request is associated with this workflow run.');

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

async function rest(path) {
  return request(`https://api.github.com/repos/${repository}${path}`);
}

async function graphql(query, variables) {
  return request('https://api.github.com/graphql', { method: 'POST', body: JSON.stringify({ query, variables }) });
}

if (decision.reasons.length === 0) {
  const pr = await rest(`/pulls/${pullRequestRef.number}`);
  const expectedSha = workflowRun.head_sha;

  const files = [];
  for (let page = 1; ; page++) {
    const batch = await rest(`/pulls/${pr.number}/files?per_page=100&page=${page}`);
    files.push(...batch);
    if (batch.length < 100) break;
  }
  const classification = classifyPullRequest(files);
  decision.classification = classification;

  const runs = await rest(`/actions/runs?head_sha=${expectedSha}&event=pull_request&per_page=100`);
  const requiredWorkflows = {};
  for (const required of ['Quality checks', 'PR readiness']) {
    const matches = runs.workflow_runs.filter((run) => run.name === required && run.head_sha === expectedSha);
    requiredWorkflows[required] = matches.some((run) => run.status === 'completed' && run.conclusion === 'success');
  }

  const [owner, name] = repository.split('/');
  const threadResult = await graphql(`
    query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        pullRequest(number: $number) {
          reviewThreads(first: 100) { nodes { isResolved } pageInfo { hasNextPage } }
        }
      }
    }`, { owner, name, number: pr.number });
  const threads = threadResult.data?.repository?.pullRequest?.reviewThreads;
  decision.reasons.push(...evaluateMergeGuards({
    classification,
    headShaMatches: pr.head.sha === expectedSha,
    draft: pr.draft,
    state: pr.state,
    mergeable: pr.mergeable,
    mergeableState: pr.mergeable_state,
    requiredWorkflows,
    unresolvedThreads: threads?.nodes.filter((thread) => !thread.isResolved).length || 0,
    allThreadsVerified: Boolean(threads) && !threads.pageInfo.hasNextPage
  }));

  decision.pr = pr.number;
  decision.headSha = expectedSha;
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
  decision.headSha ? `**Verified head:** \`${decision.headSha}\`` : '',
  '',
  '## Decision details',
  ...(decision.reasons.length ? decision.reasons.map((reason) => `- ${reason}`) : ['- Exact head SHA revalidated.', '- Strict file and diff allowlist passed.', '- Required workflows succeeded.', '- PR is open, non-draft, mergeable, and has no unresolved review threads.']),
  '',
  '> Webcam and real-device behavior are never certified by this automation. Sensitive changes always require maintainer review and relevant real-device testing.'
].filter(Boolean).join('\n');
appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
console.log(JSON.stringify(decision, null, 2));
