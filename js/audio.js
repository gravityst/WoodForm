// Fully synthesised audio — no asset files. A noise chain drives the carve/sand
// scrape, a low drone is the lathe motor, and chimes reward completion.
export class AudioEngine {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this._carveTarget = 0;
    this._carveSand = 0;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.9 : 0.0;
    this.master.connect(ctx.destination);

    // --- noise source for carving / sanding ---
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;

    this.carveFilter = ctx.createBiquadFilter();
    this.carveFilter.type = 'bandpass';
    this.carveFilter.frequency.value = 800;
    this.carveFilter.Q.value = 0.8;

    this.carveGain = ctx.createGain();
    this.carveGain.gain.value = 0;

    src.connect(this.carveFilter).connect(this.carveGain).connect(this.master);
    src.start();

    // gritty amplitude wobble on the scrape
    const lfo = ctx.createOscillator();
    lfo.type = 'sawtooth'; lfo.frequency.value = 26;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.0;
    lfo.connect(lfoGain).connect(this.carveGain.gain);
    lfo.start();
    this._lfoGain = lfoGain;

    // --- lathe motor drone ---
    this.humGain = ctx.createGain(); this.humGain.gain.value = 0;
    this.humGain.connect(this.master);
    for (const f of [70, 71.5, 140]) {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = f < 100 ? 0.5 : 0.12;
      o.connect(g).connect(this.humGain);
      o.start();
    }
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
  }

  hum(on) {
    if (!this.ctx) return;
    this.humGain.gain.setTargetAtTime(on ? 0.10 : 0, this.ctx.currentTime, 0.2);
  }

  // intensity 0..1; sand=true shifts toward a softer, higher swish
  carve(intensity, sand) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const g = Math.min(0.5, intensity * 0.5);
    this.carveGain.gain.setTargetAtTime(g, now, 0.03);
    const freq = sand ? 2600 : 600 + intensity * 700;
    this.carveFilter.frequency.setTargetAtTime(freq, now, 0.05);
    this.carveFilter.Q.setTargetAtTime(sand ? 0.5 : 1.1, now, 0.05);
    this._lfoGain.gain.setTargetAtTime(sand ? 0.02 : 0.10 * intensity, now, 0.05);
  }

  stopCarve() {
    if (!this.ctx) return;
    this.carveGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  chime() {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C pentatonic-ish
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const t = t0 + i * 0.09;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      o.connect(g).connect(this.master);
      o.start(t); o.stop(t + 0.85);
    });
  }

  click() {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 320;
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.08);
  }
}
