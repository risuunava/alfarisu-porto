// Procedural Web Audio API sound generator (Zero external audio files needed)
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.ambientGain = null;
    this.ambientOsc = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  toggle() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isMuted = !this.isMuted;

    if (!this.isMuted) {
      this.startAmbient();
      this.playChime(587.33, 'triangle', 0.15); // D5
    } else {
      this.stopAmbient();
    }
    return !this.isMuted;
  }

  startAmbient() {
    if (!this.ctx || this.ambientOsc) return;

    // Deep binaural cosmic drone
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    this.ambientGain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 55Hz

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(56.5, this.ctx.currentTime); // Subtle binaural beat

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, this.ctx.currentTime);

    this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.ambientGain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 2.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();
    this.ambientOsc = [osc1, osc2];
  }

  stopAmbient() {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
      setTimeout(() => {
        if (this.ambientOsc) {
          this.ambientOsc.forEach(osc => osc.stop());
          this.ambientOsc = null;
        }
      }, 800);
    }
  }

  playChime(freq = 440, type = 'sine', duration = 0.2) {
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.035, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // AudioContext state edge case
    }
  }

  playHover() {
    if (this.isMuted) return;
    const notes = [440, 554.37, 659.25, 880];
    const note = notes[Math.floor(Math.random() * notes.length)];
    this.playChime(note, 'sine', 0.12);
  }

  playClick() {
    if (this.isMuted) return;
    this.playChime(880, 'triangle', 0.08);
  }
}

export const sound = new SoundSystem();
