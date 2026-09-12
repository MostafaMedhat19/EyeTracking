export class BlinkDetector {
  constructor(onBlink, options = {}) {
    this.onBlink = onBlink;
    this.closedThreshold = options.closedThreshold ?? .18;
    this.openThreshold = options.openThreshold ?? .24;
    this.minClosedMs = options.minClosedMs ?? 350;
    this.maxClosedMs = options.maxClosedMs ?? 2000;
    this.cooldownMs = options.cooldownMs ?? 500;
    this.closedSince = null;
    this.lockedUntil = 0;
  }
  update(openness, now = performance.now()) {
    if (openness == null) { this.closedSince = null; return; }
    if (openness < this.closedThreshold) { if (this.closedSince == null) this.closedSince = now; return; }
    if (openness > this.openThreshold && this.closedSince != null) {
      const duration = now - this.closedSince;
      this.closedSince = null;
      if (duration >= this.minClosedMs && duration <= this.maxClosedMs && now >= this.lockedUntil) {
        this.lockedUntil = now + this.cooldownMs;
        this.onBlink();
      }
    }
  }
  reset() { this.closedSince = null; }
}
