/**
 * Tactile Mobile Haptic Feedback Helper (Web Vibration API)
 * Gracefully degrades on desktop/iOS browsers without navigator.vibrate.
 */

class HapticsManager {
  constructor() {
    this.enabled = true;
  }

  setPrefs(prefs) {
    this.enabled = prefs?.haptics !== false;
  }

  _pulse(pattern) {
    if (!this.enabled) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore user-activation or permission errors
    }
  }

  tap() {
    this._pulse(8);
  }

  swap() {
    this._pulse(10);
  }

  match(cascade = 0) {
    this._pulse(Math.min(28, 12 + cascade * 4));
  }

  explosion(power = 1) {
    if (power >= 2) this._pulse([22, 24, 38]);
    else this._pulse(24);
  }

  victory() {
    this._pulse([18, 35, 22, 35, 45]);
  }

  warning() {
    this._pulse([32, 40, 32]);
  }
}

export const haptics = new HapticsManager();

