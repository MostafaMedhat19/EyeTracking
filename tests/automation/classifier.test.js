import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPullRequest } from '../../scripts/classify-pr.mjs';

const changed = (filename, patch = '@@ -1 +1 @@\n-old\n+new', additions = 1, deletions = 1) => ({
  filename, patch, additions, deletions, status: 'modified'
});

test('allows a small README-only correction', () => {
  const result = classifyPullRequest([changed('README.md')]);
  assert.equal(result.eligible, true);
  assert.equal(result.category, 'documentation');
});

test('allows covered CSS but rejects accessibility-hiding CSS', () => {
  assert.equal(classifyPullRequest([changed('css/style.css', '@@\n+.card { gap: 1rem; }')]).eligible, true);
  const hidden = classifyPullRequest([changed('css/style.css', '@@\n+.focus-ring { outline: none; }')]);
  assert.equal(hidden.eligible, false);
  assert.equal(classifyPullRequest([changed('css/accessibility.css', '@@\n+.button { pointer-events: none; }')]).eligible, false);
});

test('allows only the explicitly covered non-sensitive JavaScript module', () => {
  assert.equal(classifyPullRequest([changed('js/suggestions.js', '@@\n+const word = "help";')]).eligible, true);
  assert.equal(classifyPullRequest([changed('js/dwellSelection.js')]).eligible, false);
  assert.equal(classifyPullRequest([changed('js/camera.js')]).eligible, false);
  assert.equal(classifyPullRequest([changed('js/suggestions.js', '@@\n+fetch("https://example.com")')]).eligible, false);
  assert.equal(classifyPullRequest([changed('js/suggestions.js', '@@\n+window["fetch"]("https://example.com")')]).eligible, false);
  assert.equal(classifyPullRequest([changed('js/suggestions.js', '@@\n+import("./camera.js")')]).eligible, false);
  assert.equal(classifyPullRequest([changed('js/suggestions.js', '@@\n+const value = Math.random()')]).eligible, false);
  assert.equal(classifyPullRequest([changed('js/suggestions.js', '@@\n+globalThis["fetch"]("https://example.com")')]).eligible, false);
});

test('rejects misleading executable documentation and unsafe file metadata', () => {
  assert.equal(classifyPullRequest([changed('README.md', '@@\n+<img src=x onerror="alert(1)">')]).eligible, false);
  assert.equal(classifyPullRequest([{ ...changed('README.md'), status: 'renamed' }]).eligible, false);
  assert.equal(classifyPullRequest([{ ...changed('README.md'), patch: undefined }]).eligible, false);
});

test('holds workflows, dependencies, tests, mixed, missing, and oversized diffs', () => {
  assert.equal(classifyPullRequest([changed('.github/workflows/quality.yml')]).eligible, false);
  assert.equal(classifyPullRequest([changed('package.json')]).eligible, false);
  assert.equal(classifyPullRequest([changed('tests/unit/new.test.js')]).eligible, false);
  assert.equal(classifyPullRequest([changed('README.md'), changed('css/style.css')]).eligible, false);
  assert.equal(classifyPullRequest([{ ...changed('README.md'), patch: null }]).eligible, false);
  assert.equal(classifyPullRequest([changed('README.md', '@@', 300, 200)]).eligible, false);
});
