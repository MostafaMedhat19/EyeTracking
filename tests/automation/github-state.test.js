import assert from 'node:assert/strict';
import test from 'node:test';
import { collectPages, evaluateRequiredChecks, resolveAssociatedPullRequest } from '../../scripts/github-state.mjs';

const repository = 'MostafaMedhat19/EyeTracking';
const pull = (number = 9, sha = 'head-sha', repoId = 42) => ({
  number,
  state: 'open',
  head: { sha, repo: { id: repoId } },
  base: { repo: { full_name: repository } }
});

test('resolves same-repository and fork PRs from trusted workflow metadata', async () => {
  for (const repoId of [1, 99]) {
    const result = await resolveAssociatedPullRequest({
      workflowRun: { event: 'pull_request', head_sha: 'head-sha', head_repository: { id: repoId }, pull_requests: [{ number: 9 }] },
      repository,
      fetchPull: async () => pull(9, 'head-sha', repoId),
      findPullsForCommit: async () => []
    });
    assert.equal(result.pr.number, 9);
    assert.equal(result.sourceRepositoryMatches, true);
  }
  const mismatch = await resolveAssociatedPullRequest({
    workflowRun: { event: 'pull_request', head_sha: 'head-sha', head_repository: { id: 99 }, pull_requests: [{ number: 9 }] },
    repository,
    fetchPull: async () => pull(9, 'head-sha', 100),
    findPullsForCommit: async () => []
  });
  assert.equal(mismatch.sourceRepositoryMatches, false);
});

test('falls back to commit association, but fails closed on ambiguity and API errors', async () => {
  const fallback = await resolveAssociatedPullRequest({
    workflowRun: { event: 'pull_request', head_sha: 'head-sha', pull_requests: [] },
    repository,
    fetchPull: async (number) => pull(number),
    findPullsForCommit: async () => [{ number: 9 }]
  });
  assert.equal(fallback.pr.number, 9);

  await assert.rejects(resolveAssociatedPullRequest({
    workflowRun: { event: 'pull_request', head_sha: 'head-sha', pull_requests: [] },
    repository,
    fetchPull: async (number) => pull(number),
    findPullsForCommit: async () => [{ number: 9 }, { number: 10 }]
  }), /Expected one/);

  await assert.rejects(collectPages(async () => { throw new Error('rate limited'); }), /rate limited/);
});

test('paginates GitHub collections without dropping the final page', async () => {
  const values = await collectPages(async (page) => page === 1 ? Array.from({ length: 100 }, (_, index) => index) : [100]);
  assert.equal(values.length, 101);
  assert.equal(values.at(-1), 100);
});

test('requires successful check runs from the expected workflow suite and exact SHA', () => {
  const requirements = [{ checkName: 'validate', workflowName: 'Quality checks', workflowPath: '.github/workflows/quality.yml', appId: 15368 }];
  const workflow = { id: 7, head_sha: 'head-sha', event: 'pull_request', name: 'Quality checks', path: '.github/workflows/quality.yml', check_suite_id: 77, status: 'completed', conclusion: 'success' };
  const check = { id: 8, head_sha: 'head-sha', name: 'validate', app: { id: 15368 }, check_suite: { id: 77 }, status: 'completed', conclusion: 'success' };

  assert.equal(evaluateRequiredChecks({ checkRuns: [check], workflowRuns: [workflow], expectedSha: 'head-sha', requirements }).requiredChecks.validate, true);
  assert.equal(evaluateRequiredChecks({ checkRuns: [{ ...check, conclusion: 'failure' }], workflowRuns: [workflow], expectedSha: 'head-sha', requirements }).requiredChecks.validate, false);
  assert.equal(evaluateRequiredChecks({ checkRuns: [{ ...check, conclusion: 'cancelled' }], workflowRuns: [workflow], expectedSha: 'head-sha', requirements }).requiredChecks.validate, false);
  assert.equal(evaluateRequiredChecks({ checkRuns: [{ ...check, head_sha: 'stale' }], workflowRuns: [workflow], expectedSha: 'head-sha', requirements }).requiredChecks.validate, false);
  assert.equal(evaluateRequiredChecks({ checkRuns: [check], workflowRuns: [], expectedSha: 'head-sha', requirements }).requiredChecks.validate, false);

  const newerFailure = { ...workflow, id: 9, check_suite_id: 99, conclusion: 'failure' };
  const newerCheck = { ...check, id: 10, check_suite: { id: 99 } };
  assert.equal(evaluateRequiredChecks({
    checkRuns: [check, newerCheck],
    workflowRuns: [workflow, newerFailure],
    expectedSha: 'head-sha',
    requirements
  }).requiredChecks.validate, false);
});
