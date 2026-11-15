import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateMergeGuards } from '../../scripts/merge-guards.mjs';

const safe = {
  classification: { eligible: true, reasons: [] },
  headShaMatches: true,
  draft: false,
  state: 'open',
  mergeable: true,
  mergeableState: 'clean',
  requiredWorkflows: { 'Quality checks': true, 'PR readiness': true },
  unresolvedThreads: 0,
  allThreadsVerified: true
};

test('all independent merge guards must pass', () => {
  assert.deepEqual(evaluateMergeGuards(safe), []);
});

test('missing checks, stale SHA, drafts, conflicts, and unresolved threads block a merge', () => {
  const reasons = evaluateMergeGuards({
    ...safe,
    headShaMatches: false,
    draft: true,
    mergeable: false,
    mergeableState: 'dirty',
    requiredWorkflows: { 'Quality checks': false, 'PR readiness': true },
    unresolvedThreads: 1
  });
  assert.ok(reasons.some((reason) => reason.includes('head SHA changed')));
  assert.ok(reasons.some((reason) => reason.includes('still a draft')));
  assert.ok(reasons.some((reason) => reason.includes('safely mergeable')));
  assert.ok(reasons.some((reason) => reason.includes('Quality checks')));
  assert.ok(reasons.some((reason) => reason.includes('unresolved')));
});
