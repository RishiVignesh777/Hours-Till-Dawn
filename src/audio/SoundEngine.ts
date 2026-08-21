// Procedural Web Audio API Sound Engine for Hours Till Dawn survival horror
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private heartbeatInterval: number | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.75;
  private isAmbientPlaying: boolean = false;
  private footstepIndex: number = 0;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      console.warn('AudioContext not supported');
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public startAmbient(floor: number = 1) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    this.stopAmbient();

    try {
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.35;

      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.value = 180 + floor * 40;

      // Low ominous sub bass
      this.ambientOsc1 = this.ctx.createOscillator();
      this.ambientOsc1.type = 'sawtooth';
      this.ambientOsc1.frequency.value = 45 - floor * 2;

      // Dissonant minor second
      this.ambientOsc2 = this.ctx.createOscillator();
      this.ambientOsc2.type = 'sine';
      this.ambientOsc2.frequency.value = 48.5 - floor * 1.5;

      this.ambientOsc1.connect(this.ambientFilter);
      this.ambientOsc2.connect(this.ambientFilter);
      this.ambientFilter.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      this.ambientOsc1.start();
      this.ambientOsc2.start();
      this.isAmbientPlaying = true;
    } catch (e) {
      console.warn('Ambient error:', e);
    }
  }

  public stopAmbient() {
    if (this.ambientOsc1) {
      try { this.ambientOsc1.stop(); this.ambientOsc1.disconnect(); } catch {}
      this.ambientOsc1 = null;
    }
    if (this.ambientOsc2) {
      try { this.ambientOsc2.stop(); this.ambientOsc2.disconnect(); } catch {}
      this.ambientOsc2 = null;
    }
    this.isAmbientPlaying = false;
  }

  public playFootstep(isSprinting: boolean = false) {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    this.footstepIndex = (this.footstepIndex + 1) % 2;
    const isLeft = this.footstepIndex === 0;

    try {
      // 1. Shoe Sole Impact Transient (Heel / Toe contact click & wood/carpet friction)
      const transientDuration = isSprinting ? 0.05 : 0.038;
      const bufferSize = Math.floor(this.ctx.sampleRate * transientDuration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Decaying noise burst
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const decay = Math.exp(-t * (isSprinting ? 16 : 24));
        data[i] = (Math.random() * 2 - 1) * decay;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Bandpass filter for authentic shoe sole material resonance
      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      const baseFreq = (isSprinting ? 860 : 700) + (isLeft ? 30 : -30) + (Math.random() * 40 - 20);
      bandpass.frequency.setValueAtTime(baseFreq, now);
      bandpass.Q.setValueAtTime(isSprinting ? 2.0 : 1.6, now);

      const noiseGain = this.ctx.createGain();
      const noiseVol = isSprinting ? 0.28 : 0.16;
      noiseGain.gain.setValueAtTime(noiseVol, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + transientDuration);

      // 2. Low-frequency floorboard resonance & weight thud
      const thudOsc = this.ctx.createOscillator();
      const thudFilter = this.ctx.createBiquadFilter();
      const thudGain = this.ctx.createGain();

      thudOsc.type = 'sine';
      const startFreq = (isSprinting ? 110 : 85) + (isLeft ? 4 : -4);
      const endFreq = isSprinting ? 40 : 30;
      const thudDuration = isSprinting ? 0.075 : 0.09;

      thudOsc.frequency.setValueAtTime(startFreq, now);
      thudOsc.frequency.exponentialRampToValueAtTime(endFreq, now + thudDuration);

      thudFilter.type = 'lowpass';
      thudFilter.frequency.setValueAtTime(240, now);

      const thudVol = isSprinting ? 0.32 : 0.20;
      thudGain.gain.setValueAtTime(thudVol, now);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, now + thudDuration);

      // 3. Subtle floor friction / carpet texture tail
      const scuffOsc = this.ctx.createOscillator();
      const scuffGain = this.ctx.createGain();
      scuffOsc.type = 'triangle';
      scuffOsc.frequency.setValueAtTime(isSprinting ? 220 : 160, now);
      scuffOsc.frequency.exponentialRampToValueAtTime(70, now + 0.055);
      scuffGain.gain.setValueAtTime(isSprinting ? 0.12 : 0.06, now);
      scuffGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

      // Connect nodes
      noiseSource.connect(bandpass);
      bandpass.connect(noiseGain);

      thudOsc.connect(thudFilter);
      thudFilter.connect(thudGain);

      scuffOsc.connect(scuffGain);

      // Mixer
      const mixer = this.ctx.createGain();
      noiseGain.connect(mixer);
      thudGain.connect(mixer);
      scuffGain.connect(mixer);

      // Stereo subtle spatial panning (alternating left and right foot)
      if (typeof this.ctx.createStereoPanner === 'function') {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(isLeft ? -0.22 : 0.22, now);
        mixer.connect(panner);
        panner.connect(this.masterGain);
      } else {
        mixer.connect(this.masterGain);
      }

      // Start sound nodes
      noiseSource.start(now);
      thudOsc.start(now);
      scuffOsc.start(now);

      thudOsc.stop(now + thudDuration);
      scuffOsc.stop(now + 0.06);
    } catch {
      // Graceful fallback
    }
  }

  public playFlashlightClick() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.setValueAtTime(800, now + 0.015);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playPipeSwing() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Whoosh noise
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.linearRampToValueAtTime(900, now + 0.08);
    filter.frequency.linearRampToValueAtTime(200, now + 0.18);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  public playPipeHit() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Metallic crunch
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(120, now);
    osc1.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(450, now);
    osc2.frequency.exponentialRampToValueAtTime(90, now + 0.12);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);
  }

  public playGunshot(type: 'pistol' | 'revolver' | 'shotgun' = 'pistol') {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const duration = type === 'shotgun' ? 0.45 : (type === 'revolver' ? 0.3 : 0.22);

    // Noise blast
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const decayFactor = type === 'shotgun' ? 0.09 : (type === 'revolver' ? 0.05 : 0.035);
    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.exp(-i / (this.ctx.sampleRate * decayFactor));
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // High crack for 9mm pistol / snap
    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'highpass';
    crackFilter.frequency.setValueAtTime(type === 'pistol' ? 800 : 400, now);

    // Low boom oscillator
    const boom = this.ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(type === 'shotgun' ? 140 : (type === 'revolver' ? 180 : 220), now);
    boom.frequency.exponentialRampToValueAtTime(30, now + duration);

    const boomGain = this.ctx.createGain();
    boomGain.gain.setValueAtTime(type === 'pistol' ? 0.7 : 0.8, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(type === 'pistol' ? 0.65 : 0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    boom.connect(boomGain);
    boomGain.connect(this.masterGain);
    noise.connect(crackFilter);
    crackFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    boom.start(now);
    noise.start(now);
    boom.stop(now + duration);
  }

  public playMonsterStunned() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Distorted agonized shock/shudder screech
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.35);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playCameraSparks() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playCameraDestroyed() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Electrical shatter & explosion
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.exp(-i / (this.ctx.sampleRate * 0.08));
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, now);

    const buzz = this.ctx.createOscillator();
    buzz.type = 'sawtooth';
    buzz.frequency.setValueAtTime(60, now);
    buzz.frequency.linearRampToValueAtTime(30, now + 0.35);

    const buzzGain = this.ctx.createGain();
    buzzGain.gain.setValueAtTime(0.4, now);
    buzzGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    buzz.connect(buzzGain);
    buzzGain.connect(this.masterGain);

    buzz.start(now);
    noise.start(now);
    buzz.stop(now + 0.35);
  }

  public playDoorUnlock() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Heavy metallic latch unlocking sequence
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(160, now);
    osc1.frequency.setValueAtTime(320, now + 0.08);
    osc1.frequency.setValueAtTime(540, now + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    gain.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.45);
  }

  public playCrawlerScreech() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.35);

    lfo.type = 'square';
    lfo.frequency.setValueAtTime(28, now);
    lfoGain.gain.setValueAtTime(80, now);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.38);
    lfo.stop(now + 0.38);
  }

  public playMonsterGrowl(intensity: number = 1) {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80 * intensity, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, now);

    gain.gain.setValueAtTime(0.35 * Math.min(intensity, 1.5), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  public playCrawlerSkitter() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const clickTime = now + i * 0.05 + Math.random() * 0.02;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(700 + Math.random() * 400, clickTime);
      gain.gain.setValueAtTime(0.09, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.03);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(clickTime);
      osc.stop(clickTime + 0.03);
    }
  }

  public playItemPickup() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(660, now + 0.08);
    osc.frequency.setValueAtTime(880, now + 0.16);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playPlayerHurt() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playHorrorStinger() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Dissonant clustered chord
    const freqs = [185, 233, 277, 311, 466, 622];
    freqs.forEach((f) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.linearRampToValueAtTime(f * 0.95, now + 0.9);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.9);
    });
  }

  public playHeartbeat() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Thump 1
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(75, now);
    osc1.frequency.exponentialRampToValueAtTime(35, now + 0.12);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Thump 2
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(65, now + 0.14);
    osc2.frequency.exponentialRampToValueAtTime(30, now + 0.28);
    gain2.gain.setValueAtTime(0.3, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.28);
  }
}

export const soundEngine = new SoundEngine();
