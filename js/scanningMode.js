export class ScanningMode {
  constructor(getTargets) {
    this.getTargets = getTargets;
    this.timer = null;
    this.index = -1;
  }
  start(intervalMs) {
    this.stop();
    this.tick();
    this.timer = setInterval(() => this.tick(), intervalMs);
  }
  tick() {
    const targets = this.getTargets();
    if (!targets.length) return;
    this.clearHighlight();
    this.index = (this.index + 1) % targets.length;
    targets[this.index]?.classList.add('focused');
  }
  clearHighlight() {
    const targets = this.getTargets();
    targets[this.index]?.classList.remove('focused');
  }
  current() { return this.getTargets()[this.index] ?? null; }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.clearHighlight();
    this.index = -1;
  }
}
