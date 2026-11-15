import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyPullRequest } from '../../scripts/classify-pr.mjs';
import { evaluateMergeGuards } from '../../scripts/merge-guards.mjs';

const file = (filename, patch = '@@\n-old\n+new') => ({ filename, patch, additions: 1, deletions: 1, status: 'modified' });
const guards = (classification, overrides = {}) => evaluateMergeGuards({
  classification,
  headShaMatches: true,
  sourceRepositoryMatches: true,
  draft: false,
  state: 'open',
  mergeable: true,
  mergeableState: 'clean',
  requiredWorkflows: { 'PR readiness': true, validate: true },
  unresolvedThreads: 0,
  allThreadsVerified: true,
  ...overrides
});

test('dry-run scenarios A-E classify safe and sensitive changes conservatively', () => {
  const scenarios = [
    ['A documentation', [file('README.md')], true],
    ['B covered CSS', [file('css/style.css', '@@\n+.card { gap: 1rem; }')], true],
    ['C suggestions JavaScript', [file('js/suggestions.js', '@@\n+const fallback = "HELP";')], true],
    ['D sensitive JavaScript', [file('js/gazeEstimator.js')], false],
    ['E workflow', [file('.github/workflows/quality.yml')], false],
    ['E dependency', [file('package-lock.json')], false]
  ];
  for (const [name, files, expected] of scenarios) {
    const classification = classifyPullRequest(files);
    assert.equal(classification.eligible, expected, name);
    assert.equal(guards(classification).length === 0, expected, `${name} guards`);
  }
});

test('dry-run scenarios F-G block missing, failed, stale, and unresolved state', () => {
  const classification = classifyPullRequest([file('README.md')]);
  assert.ok(guards(classification, { requiredWorkflows: { 'PR readiness': true, validate: false } }).length > 0);
  assert.ok(guards(classification, { requiredWorkflows: { 'PR readiness': true } }).length > 0);
  assert.ok(guards(classification, { headShaMatches: false }).length > 0);
  assert.ok(guards(classification, { unresolvedThreads: 1 }).length > 0);
  assert.ok(guards(classification, { allThreadsVerified: false }).length > 0);
});
