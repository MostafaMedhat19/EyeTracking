import test from 'node:test';
import assert from 'node:assert/strict';
import { getSuggestions } from '../../js/suggestions.js';

test('suggestions are deterministic and safe for an empty message', () => {
  const result = getSuggestions('', '');
  assert.ok(Array.isArray(result));
  assert.ok(result.length >= 4);
  assert.ok(result.every((item) => typeof item === 'string' && item.trim().length > 0));
});

test('suggestions react to the latest communication context', () => {
  const baseline = getSuggestions('', '');
  const contextual = getSuggestions('I need', 'water');
  assert.notDeepEqual(contextual, baseline);
  assert.ok(contextual.every((item) => item.length <= 80));
});
