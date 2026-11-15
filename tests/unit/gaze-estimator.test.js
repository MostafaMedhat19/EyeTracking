import test from 'node:test';
import assert from 'node:assert/strict';
import { getDirection, smoothGaze } from '../../js/gazeEstimator.js';
import { mapGaze } from '../../js/calibration.js';

test('getDirection classifies coarse gaze zones with a stable center', () => {
  assert.equal(getDirection({ x: 0.5, y: 0.5 }), 'CENTER');
  assert.equal(getDirection({ x: 0.2, y: 0.5 }), 'LEFT');
  assert.equal(getDirection({ x: 0.8, y: 0.5 }), 'RIGHT');
  assert.equal(getDirection({ x: 0.5, y: 0.2 }), 'UP');
  assert.equal(getDirection({ x: 0.5, y: 0.8 }), 'DOWN');
});

test('smoothGaze applies deterministic exponential smoothing', () => {
  const next = smoothGaze({ x: 1, y: 0, marker: true }, { x: 0, y: 1 }, 0.25);
  assert.equal(next.x, 0.25);
  assert.equal(next.y, 0.75);
  assert.equal(next.marker, true);
});

test('mapGaze maps affine calibration output and clamps to viewport', () => {
  globalThis.innerWidth = 1000;
  globalThis.innerHeight = 500;
  const model = { x: [1000, 0, 0], y: [0, 500, 0] };
  assert.deepEqual(mapGaze({ x: 0.25, y: 0.75 }, model), { x: 250, y: 375 });
  assert.deepEqual(mapGaze({ x: 2, y: -1 }, model), { x: 1000, y: 0 });
});
