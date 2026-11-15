export const REQUIRED_CHECKS = [
  {
    checkName: 'PR readiness',
    workflowName: 'Pull request readiness',
    workflowPath: '.github/workflows/pr-readiness.yml',
    appId: 15368
  },
  {
    checkName: 'validate',
    workflowName: 'Quality checks',
    workflowPath: '.github/workflows/quality.yml',
    appId: 15368
  }
];

export async function collectPages(fetchPage, maxPages = 50) {
  const values = [];
  for (let page = 1; page <= maxPages; page++) {
    const batch = await fetchPage(page);
    if (!Array.isArray(batch)) throw new Error('Paginated GitHub response was not an array.');
    values.push(...batch);
    if (batch.length < 100) return values;
  }
  throw new Error(`GitHub pagination exceeded ${maxPages} pages.`);
}

export async function resolveAssociatedPullRequest({ workflowRun, repository, fetchPull, findPullsForCommit }) {
  if (workflowRun?.event !== 'pull_request') throw new Error('Trusted decision was not triggered by a pull_request workflow run.');
  if (!workflowRun?.head_sha) throw new Error('Workflow run did not provide a head SHA.');

  let numbers = [...new Set((workflowRun.pull_requests || []).map((pr) => pr.number).filter(Number.isInteger))];
  if (numbers.length === 0) {
    const associated = await findPullsForCommit(workflowRun.head_sha);
    numbers = [...new Set(associated.map((pr) => pr.number).filter(Number.isInteger))];
  }
  if (numbers.length === 0) throw new Error('No pull request could be associated with the completed workflow run.');

  const candidates = (await Promise.all(numbers.map((number) => fetchPull(number))))
    .filter((pr) => pr?.base?.repo?.full_name === repository);
  const exact = candidates.filter((pr) => pr?.head?.sha === workflowRun.head_sha);
  const matches = exact.length ? exact : candidates;
  if (matches.length !== 1) throw new Error(`Expected one associated pull request, found ${matches.length}.`);

  const pr = matches[0];
  const runRepoId = workflowRun.head_repository?.id;
  const prRepoId = pr.head?.repo?.id;
  return {
    pr,
    expectedSha: workflowRun.head_sha,
    sourceRepositoryMatches: !runRepoId || !prRepoId || runRepoId === prRepoId
  };
}

function newest(items) {
  return [...items].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
}

export function evaluateRequiredChecks({ checkRuns, workflowRuns, expectedSha, requirements = REQUIRED_CHECKS }) {
  const requiredChecks = {};
  const details = [];

  for (const requirement of requirements) {
    const run = newest(workflowRuns.filter((candidate) =>
      candidate.head_sha === expectedSha &&
      candidate.event === 'pull_request' &&
      candidate.name === requirement.workflowName &&
      candidate.path === requirement.workflowPath
    ));
    const check = run && newest(checkRuns.filter((candidate) =>
      candidate.head_sha === expectedSha &&
      candidate.name === requirement.checkName &&
      candidate.app?.id === requirement.appId &&
      candidate.check_suite?.id === run.check_suite_id
    ));
    const passed = Boolean(
      run?.status === 'completed' && run?.conclusion === 'success' &&
      check?.status === 'completed' && check?.conclusion === 'success'
    );
    requiredChecks[requirement.checkName] = passed;
    details.push({
      check: requirement.checkName,
      workflow: requirement.workflowName,
      workflowStatus: run?.status || 'missing',
      workflowConclusion: run?.conclusion || 'missing',
      checkStatus: check?.status || 'missing',
      checkConclusion: check?.conclusion || 'missing'
    });
  }
  return { requiredChecks, details };
}
