const LEFT_EYE = [33, 133, 160, 158, 153, 144, 145, 159, 157, 173];
const RIGHT_EYE = [362, 263, 387, 385, 380, 373, 374, 386, 384, 398];
const LEFT_IRIS = [468, 469, 470, 471, 472];
const RIGHT_IRIS = [473, 474, 475, 476, 477];
const average = (items) => items.reduce((a, b) => a + b, 0) / items.length;
function eyeRatio(points, eye, iris) {
  const irisPoints = iris.map(i => points[i]);
  const eyePoints = eye.map(i => points[i]);
  const cx = average(irisPoints.map(p => p.x)), cy = average(irisPoints.map(p => p.y));
  const minX = Math.min(...eyePoints.map(p => p.x)), maxX = Math.max(...eyePoints.map(p => p.x));
  const minY = Math.min(...eyePoints.map(p => p.y)), maxY = Math.max(...eyePoints.map(p => p.y));
  return { x: (cx - minX) / (maxX - minX), y: (cy - minY) / (maxY - minY), iris: { x: cx, y: cy } };
}
export function estimateGaze(points) {
  if (!points || points.length < 478) return null;
  const left = eyeRatio(points, LEFT_EYE, LEFT_IRIS), right = eyeRatio(points, RIGHT_EYE, RIGHT_IRIS);
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2, left, right };
}
export function smoothGaze(gaze, previous, alpha = .28) {
  if (!previous) return gaze;
  return { ...gaze, x: previous.x + (gaze.x - previous.x) * alpha, y: previous.y + (gaze.y - previous.y) * alpha };
}
export function getDirection(gaze, threshold = .11, previous = 'CENTER') {
  const dx = gaze.x - .5, dy = gaze.y - .5;
  // Keep the prior direction until the eye clearly returns toward the centre.
  // This prevents natural iris jitter from repeatedly changing an active command.
  const hold = threshold * .55;
  if (previous === 'LEFT' && dx < -hold && Math.abs(dx) >= Math.abs(dy)) return 'LEFT';
  if (previous === 'RIGHT' && dx > hold && Math.abs(dx) >= Math.abs(dy)) return 'RIGHT';
  if (previous === 'UP' && dy < -hold && Math.abs(dy) > Math.abs(dx)) return 'UP';
  if (previous === 'DOWN' && dy > hold && Math.abs(dy) > Math.abs(dx)) return 'DOWN';
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return 'CENTER';
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'LEFT' : 'RIGHT';
  return dy < 0 ? 'UP' : 'DOWN';
}
