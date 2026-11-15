import test from 'node:test';
import assert from 'node:assert/strict';
import { DwellSelection } from '../../js/dwellSelection.js';

function target() {
  const classes = new Set();
  const styles = new Map();
  return {
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) },
    style: { setProperty: (name, value) => styles.set(name, value), removeProperty: (name) => styles.delete(name) },
    classes,
    styles
  };
}

test('dwell selection fires once after the configured duration', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const selected = [];
  const dwell = new DwellSelection((item) => selected.push(item), () => 1000);
  const item = target();
  dwell.update(item, 100);
  dwell.update(item, 1099);
  assert.equal(selected.length, 0);
  dwell.update(item, 1100);
  assert.deepEqual(selected, [item]);
  assert.equal(item.classes.has('focused'), false);
});

test('changing targets resets progress', () => {
  const dwell = new DwellSelection(() => assert.fail('must not select'), () => 1000);
  const first = target();
  const second = target();
  dwell.update(first, 0);
  dwell.update(first, 500);
  dwell.update(second, 600);
  assert.equal(first.classes.has('focused'), false);
  assert.equal(second.classes.has('focused'), true);
  assert.equal(second.styles.get('--dwell'), 0);
});
