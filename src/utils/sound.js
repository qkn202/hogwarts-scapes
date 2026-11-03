/**
 * Polyphonic Web Audio Procedural Sound, Weather Ambience & Master Volume Synthesizer
 * - 16-step 2-Voice Polyphonic Celesta + Enchanted Harp accompaniment
 * - Dynamic Weather Ambience (Day Fireplace/Songbird, Starry Night Shimmer, Snowy Wind Murmur)
 * - Continuous 0–100% Master Volume control with zero external audio files.
 */

class SoundManager {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.bgmEnabled = true;
    this.sfxEnabled = true;
    this.volume = 0.8;
    this.weather = 'day';
    this.currentTheme = null;
    this.bgmTimer = null;
    this.stepIndex = 0;
  }

  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setPrefs({ bgm, sfx, volume }) {
    if (bgm !== undefined) this.bgmEnabled = bgm;
    if (sfx !== undefined) this.sfxEnabled = sfx;
    if (volume !== undefined) {
      this.volume = Math.max(0, Math.min(1, Number(volume) / 100));
    }
    if (!this.bgmEnabled || this.volume <= 0) {
      this.stopBgm();
    } else if (this.currentTheme && !this.bgmTimer) {
      const theme = this.currentTheme;
      this.currentTheme = null;
      this.playBgm(theme);
    }
  }

  setWeather(weatherMode) {
    if (['day', 'night', 'snow'].includes(weatherMode)) {
      this.weather = weatherMode;
    }
  }

  _tone(freq, duration, type = 'sine', gainVal = 0.08, delay = 0, slideTo = null) {
    if (!this.ctx || this.volume <= 0) return;
    const scaled = gainVal * this.volume;
    if (scaled <= 0.0002) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(scaled, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  _noise(duration = 0.25, gainVal = 0.12, filterFreq = 800, delay = 0) {
    if (!this.ctx || this.volume <= 0) return;
    const scaled = gainVal * this.volume;
    if (scaled <= 0.0002) return;
    const now = this.ctx.currentTime + delay;
    const sampleCount = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(scaled, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
    src.stop(now + duration);
  }

  /**
   * Starts 2-voice polyphonic BGM + weather ambience tailored to game & screen.
   * @param {'homescapes_world' | 'gardenscapes_world' | 'homescapes_match3' | 'gardenscapes_match3' | 'launcher'} theme
   */
  playBgm(theme) {
    this.currentTheme = theme;
    if (!this.bgmEnabled || this.volume <= 0) return;
    this.unlock();
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.stepIndex = 0;

    // 16-step Evolving Wizarding Melodies + Warm Harp Bass Roots
    const scores = {
      launcher: {
        lead: [329.6, 392.0, 493.9, 622.3, 587.3, 493.9, 440.0, 493.9, 329.6, 440.0, 523.3, 659.3, 587.3, 523.3, 493.9, 392.0],
        bass: [164.8, 196.0, 220.0, 185.0],
      },
      homescapes_world: {
        lead: [329.6, 493.9, 587.3, 554.4, 493.9, 659.3, 587.3, 466.2, 392.0, 493.9, 659.3, 740.0, 659.3, 587.3, 493.9, 440.0],
        bass: [164.8, 146.8, 196.0, 185.0],
      },
      gardenscapes_world: {
        lead: [293.7, 349.2, 440.0, 523.3, 587.3, 493.9, 440.0, 392.0, 349.2, 440.0, 587.3, 659.3, 587.3, 523.3, 440.0, 349.2],
        bass: [146.8, 174.6, 196.0, 164.8],
      },
      homescapes_match3: {
        lead: [329.6, 392.0, 493.9, 659.3, 587.3, 493.9, 466.2, 392.0, 369.9, 440.0, 587.3, 740.0, 659.3, 587.3, 493.9, 440.0],
        bass: [164.8, 196.0, 185.0, 146.8],
      },
      gardenscapes_match3: {
        lead: [349.2, 440.0, 523.3, 659.3, 587.3, 523.3, 440.0, 392.0, 392.0, 493.9, 587.3, 784.0, 659.3, 587.3, 523.3, 440.0],
        bass: [174.6, 220.0, 196.0, 164.8],
      },
    };

    const score = scores[theme] || scores.launcher;
    const isMatch = theme.includes('match3');
    const isWorld = theme.includes('world');
    const intervalMs = isMatch ? 360 : 500;
    const wave = theme.startsWith('gardenscapes') ? 'triangle' : 'sine';

    this.bgmTimer = setInterval(() => {
      if (!this.bgmEnabled || this.volume <= 0 || !this.ctx || this.ctx.state !== 'running') return;
      const step = this.stepIndex;
      const n = score.lead[step % score.lead.length];
      // Voice 1: Celesta Lead + Octave Bell Harmonic
      this._tone(n, isMatch ? 0.28 : 0.48, wave, 0.022);
      this._tone(n * 2, isMatch ? 0.14 : 0.24, 'sine', 0.007, 0.012);

      // Voice 2: Polyphonic Harp Bass + Fifth Dyad every 2 beats
      if (step % 2 === 0) {
        const root = score.bass[Math.floor(step / 4) % score.bass.length];
        this._tone(root, isMatch ? 0.45 : 0.78, 'triangle', 0.017);
        if (step % 4 === 2) this._tone(root * 1.5, 0.55, 'sine', 0.011, 0.03);
      }

      // Weather Ambience Layer in 2.5D World View
      if (isWorld && step % 8 === 3) {
        if (this.weather === 'snow') {
          this._noise(0.55, 0.014, 420); // Soft wintry wind murmur
        } else if (this.weather === 'night') {
          this._tone(1318.5, 0.32, 'sine', 0.008, 0.04, 1568.0); // Starry astral shimmer
        } else if (theme === 'homescapes_world') {
          this._noise(0.08, 0.012, 1100); // Cozy Gryffindor hearth crackle
        } else {
          this._tone(784.0, 0.14, 'sine', 0.01, 0.03, 987.8); // Daytime songbird chirp
        }
      }
      this.stepIndex++;
    }, intervalMs);
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  sfxClick() {
    if (!this.sfxEnabled) return;
    this.unlock();
    this._tone(580, 0.07, 'triangle', 0.07, 0, 740);
  }

  sfxSwap() {
    if (!this.sfxEnabled) return;
    this.unlock();
    this._tone(380, 0.09, 'sine', 0.07, 0, 540);
  }

  sfxInvalid() {
    if (!this.sfxEnabled) return;
    this.unlock();
    this._tone(210, 0.11, 'sawtooth', 0.05, 0, 165);
    this._tone(175, 0.13, 'sawtooth', 0.05, 0.11, 140);
  }

  sfxMatch(cascade = 0) {
    if (!this.sfxEnabled) return;
    this.unlock();
    const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];
    const base = scale[Math.min(cascade, scale.length - 1)];
    this._tone(base, 0.16, 'triangle', 0.09);
    this._tone(base * 1.25, 0.2, 'sine', 0.06, 0.04);
  }

  sfxPowerupCreate() {
    if (!this.sfxEnabled) return;
    this.unlock();
    this._tone(523.3, 0.12, 'triangle', 0.09, 0, 784);
    this._tone(784.0, 0.18, 'sine', 0.09, 0.07, 1046.5);
  }

  sfxRocket() {
    if (!this.sfxEnabled) return;
    this.unlock();
    this._noise(0.28, 0.13, 1800);
    this._tone(340, 0.26, 'sawtooth', 0.06, 0, 960);
  }

  sfxPlane() {
    if (!this.sfxEnabled) return;
    this.unlock();
    this._tone(480, 0.22, 'sine', 0.07, 0, 820);
    this._tone(820, 0.18, 'triangle', 0.06, 0.16, 620);
  }

  sfxExplosion(power = 1) {
    if (!this.sfxEnabled) return;
    this.unlock();
    const dur = Math.min(0.65, 0.25 + power * 0.1);
    this._noise(dur, Math.min(0.24, 0.11 + power * 0.03), 500 + power * 120);
    this._tone(150, dur, 'sine', 0.13, 0, 38);
  }

  sfxRainbow() {
    if (!this.sfxEnabled) return;
    this.unlock();
    [523.3, 659.3, 784.0, 1046.5, 1318.5].forEach((f, idx) => {
      this._tone(f, 0.22, 'triangle', 0.07, idx * 0.045);
    });
  }

  sfxGnome() {
    if (!this.sfxEnabled) return;
    this.unlock();
    [587.3, 740.0, 880.0, 1174.7].forEach((f, idx) => {
      this._tone(f, 0.15, 'triangle', 0.09, idx * 0.06);
    });
  }

  sfxCarpet() {
    if (!this.sfxEnabled) return;
    this.unlock();
    this._noise(0.14, 0.06, 1200);
    this._tone(440, 0.12, 'sine', 0.05, 0, 620);
  }

  sfxRenovate() {
    if (!this.sfxEnabled) return;
    this.unlock();
    [392.0, 493.9, 587.3, 784.0, 987.8].forEach((f, idx) => {
      this._tone(f, 0.28, 'triangle', 0.09, idx * 0.07);
    });
  }

  sfxCoin() {
    if (!this.sfxEnabled) return;
    this.unlock();
    this._tone(987.8, 0.08, 'sine', 0.07);
    this._tone(1318.5, 0.16, 'sine', 0.07, 0.06);
  }

  sfxVictory() {
    if (!this.sfxEnabled) return;
    this.unlock();
    [523.3, 659.3, 784.0, 1046.5, 784.0, 1046.5].forEach((f, i) => {
      this._tone(f, 0.24, 'triangle', 0.1, i * 0.1);
    });
  }

  sfxDefeat() {
    if (!this.sfxEnabled) return;
    this.unlock();
    [392.0, 369.99, 349.23, 311.13].forEach((f, i) => {
      this._tone(f, 0.28, 'sine', 0.08, i * 0.15);
    });
  }
}

export const sound = new SoundManager();
