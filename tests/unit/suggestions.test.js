import test from 'node:test';
import assert from 'node:assert/strict';
import { getSuggestions } from '../../js/suggestions.js';

test('suggestions are deterministic and safe for an empty message', () => {
  const result = getSuggestions('', '');
  assert.deepEqual(result, ['YES', 'NO', 'HELP', 'THANK YOU']);
  assert.deepEqual(getSuggestions('', ''), result);
  assert.ok(result.every((item) => typeof item === 'string' && item.trim().length > 0));
});

test('suggestions preserve reviewed communication contexts', () => {
  const cases = [
    [['', 'water'], ['WATER', 'JUICE', 'PLEASE', 'NO THANK YOU']],
    [['', 'hungry'], ['FOOD', 'YES PLEASE', 'NO THANK YOU', 'MORE']],
    [['', 'pain'], ['PAIN', 'HELP', 'DOCTOR', 'PLEASE']],
    [['I need', ''], ['WATER', 'FOOD', 'SLEEP', 'HELP']]
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual(getSuggestions(...input), expected);
    assert.ok(expected.every((item) => item.length <= 80));
  }
});
