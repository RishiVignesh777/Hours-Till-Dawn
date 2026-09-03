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

  public playBatteryPickup() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(600, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
    osc2.frequency.setValueAtTime(1200, now);
    osc2.frequency.exponentialRampToValueAtTime(2400, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.15);
  }

  public playBatteryReload() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // 1. Mechanical compartment latch click
    const oscClick = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    oscClick.type = 'square';
    oscClick.frequency.setValueAtTime(900, now);
    oscClick.frequency.exponentialRampToValueAtTime(300, now + 0.03);
    clickGain.gain.setValueAtTime(0.3, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    oscClick.connect(clickGain);
    clickGain.connect(this.masterGain);
    oscClick.start(now);
    oscClick.stop(now + 0.04);

    // 2. High-pitch capacitor recharge power-up whine
    const oscWhine = this.ctx.createOscillator();
    const whineGain = this.ctx.createGain();
    oscWhine.type = 'sine';
    oscWhine.frequency.setValueAtTime(400, now + 0.04);
    oscWhine.frequency.exponentialRampToValueAtTime(1800, now + 0.22);
    whineGain.gain.setValueAtTime(0.001, now);
    whineGain.gain.setValueAtTime(0.22, now + 0.04);
    whineGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    oscWhine.connect(whineGain);
    whineGain.connect(this.masterGain);
    oscWhine.start(now + 0.04);
    oscWhine.stop(now + 0.25);
  }

  public playFlashlightFlicker() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // 1. Low frequency buzzing filament arc
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140 + Math.random() * 80, now);
    osc.frequency.setValueAtTime(70 + Math.random() * 40, now + 0.02);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);

    // 2. High frequency electric crackle / static burst
    const crackleBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
    const data = crackleBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = crackleBuffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.07, now);
    noiseSource.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSource.start(now);
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

  public playHeartbeat(intensity: number = 1.0, isHiding: boolean = false, bpm: number = 80) {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const clampedIntensity = Math.max(0.2, Math.min(2.0, intensity));
    const lubDubInterval = Math.max(0.08, 0.18 - (bpm / 180) * 0.08); // Lub-to-dub delay tightens under tachycardia
    const baseVol = (isHiding ? 0.42 : 0.32) * clampedIntensity;

    // 1. First Beat (Lub) - Ventricular contraction (deeper, punchier)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const filter1 = this.ctx.createBiquadFilter();

    osc1.type = isHiding ? 'triangle' : 'sine';
    const startFreq1 = 80 + clampedIntensity * 12;
    const endFreq1 = 32;
    osc1.frequency.setValueAtTime(startFreq1, now);
    osc1.frequency.exponentialRampToValueAtTime(endFreq1, now + 0.11);

    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(isHiding ? 140 : 220, now);

    gain1.gain.setValueAtTime(baseVol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + 0.11);

    // 2. Second Beat (Dub) - Semilunar valves closing (higher resonance, slightly softer)
    const dubTime = now + lubDubInterval;
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    const filter2 = this.ctx.createBiquadFilter();

    osc2.type = 'sine';
    const startFreq2 = 70 + clampedIntensity * 8;
    const endFreq2 = 28;
    osc2.frequency.setValueAtTime(startFreq2, dubTime);
    osc2.frequency.exponentialRampToValueAtTime(endFreq2, dubTime + 0.14);

    filter2.type = 'lowpass';
    filter2.frequency.setValueAtTime(isHiding ? 120 : 180, dubTime);

    gain2.gain.setValueAtTime(baseVol * 0.78, dubTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, dubTime + 0.14);

    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(this.masterGain);

    osc2.start(dubTime);
    osc2.stop(dubTime + 0.14);

    // 3. Sub-bass Blood Rush Resonance (intimate arterial thud, especially when hiding or extreme proximity)
    if (clampedIntensity > 0.65 || isHiding) {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(42, now);
      subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.22);

      const subVol = (isHiding ? 0.35 : 0.22) * clampedIntensity;
      subGain.gain.setValueAtTime(subVol, now);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      subOsc.connect(subGain);
      subGain.connect(this.masterGain);
      subOsc.start(now);
      subOsc.stop(now + 0.22);
    }
  }

  // --- PSYCHOLOGICAL PARANOIA & AMBIENT AUDIO METHODS ---

  public playFootstepsBehind() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const isLeft = Math.random() > 0.5;

    for (let i = 0; i < 3; i++) {
      const stepTime = now + i * 0.42 + Math.random() * 0.05;
      
      // Leather sole scuff
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (this.ctx.sampleRate * 0.02));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, stepTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25 - i * 0.04, stepTime);
      gain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.08);

      // Floorboard squeak
      const squeak = this.ctx.createOscillator();
      const squeakGain = this.ctx.createGain();
      squeak.type = 'triangle';
      squeak.frequency.setValueAtTime(280 + Math.random() * 80, stepTime);
      squeak.frequency.linearRampToValueAtTime(360 + Math.random() * 60, stepTime + 0.06);
      squeakGain.gain.setValueAtTime(0.06, stepTime);
      squeakGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.06);

      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (panner) {
        panner.pan.setValueAtTime(isLeft ? -0.45 : 0.45, stepTime);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        squeak.connect(squeakGain);
        squeakGain.connect(panner);
        panner.connect(this.masterGain);
      } else {
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        squeak.connect(squeakGain);
        squeakGain.connect(this.masterGain);
      }

      noise.start(stepTime);
      squeak.start(stepTime);
      squeak.stop(stepTime + 0.06);
    }
  }

  public playCeilingCrawl() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < 7; i++) {
      const stepTime = now + i * 0.09 + Math.random() * 0.03;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600 + Math.random() * 500, stepTime);
      osc.frequency.exponentialRampToValueAtTime(150, stepTime + 0.04);

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(400, stepTime);

      gain.gain.setValueAtTime(0.12, stepTime);
      gain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(stepTime);
      osc.stop(stepTime + 0.045);
    }
  }

  public playBreathingClose() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const side = Math.random() > 0.5 ? -0.85 : 0.85;

    // Filtered shaped noise for creepy raspy exhale
    const duration = 1.4;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const env = Math.sin(t * Math.PI) * Math.pow(Math.sin(t * Math.PI * 3) * 0.5 + 0.5, 0.4);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.linearRampToValueAtTime(420, now + duration);
    filter.Q.setValueAtTime(3.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(side, now);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);
    } else {
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
    }

    noise.start(now);
  }

  public playDoorCreakSlow() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(480, now + 0.8);
    osc.frequency.linearRampToValueAtTime(180, now + 1.6);

    lfo.type = 'sawtooth';
    lfo.frequency.setValueAtTime(16, now);
    lfoGain.gain.setValueAtTime(60, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    lfo.start(now);
    osc.stop(now + 1.6);
    lfo.stop(now + 1.6);
  }

  public playHallwaySprint() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < 9; i++) {
      const stepTime = now + i * 0.14;
      const panVal = -0.9 + (i / 8) * 1.8; // pans across left to right
      const vol = Math.sin((i / 8) * Math.PI) * 0.32;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90, stepTime);
      osc.frequency.exponentialRampToValueAtTime(40, stepTime + 0.06);

      gain.gain.setValueAtTime(vol, stepTime);
      gain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.06);

      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (panner) {
        panner.pan.setValueAtTime(panVal, stepTime);
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterGain);
      } else {
        osc.connect(gain);
        gain.connect(this.masterGain);
      }

      osc.start(stepTime);
      osc.stop(stepTime + 0.06);
    }
  }

  public playWallScratching() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const duration = 1.1;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const burst = Math.sin(t * 40) > 0.2 ? 1 : 0.1;
      data[i] = (Math.random() * 2 - 1) * burst;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(4.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  public playChildLaugh() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const notes = [659, 784, 880, 784, 659, 587, 659];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const noteTime = now + idx * 0.12 + (idx > 3 ? 0.08 : 0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.08, noteTime + 0.08);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, noteTime);

      gain.gain.setValueAtTime(0.13, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.14);
    });
  }

  public playPhoneRinging() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    for (let r = 0; r < 2; r++) {
      const ringStart = now + r * 0.7;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, ringStart);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, ringStart);

      // Tremolo hammer bell
      lfo.type = 'square';
      lfo.frequency.setValueAtTime(20, ringStart);
      lfoGain.gain.setValueAtTime(1.0, ringStart);

      gain.gain.setValueAtTime(0.22, ringStart);
      gain.gain.exponentialRampToValueAtTime(0.001, ringStart + 0.5);

      lfo.connect(gain.gain);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(ringStart);
      osc2.start(ringStart);
      lfo.start(ringStart);
      osc1.stop(ringStart + 0.5);
      osc2.stop(ringStart + 0.5);
      lfo.stop(ringStart + 0.5);
    }
  }

  // --- PARANORMAL PROP EVENT SOUNDS ---

  public playChairScrape() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(190, now + 0.25);
    osc.frequency.linearRampToValueAtTime(120, now + 0.6);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.Q.setValueAtTime(2.0, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  public playPictureFall() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Wood frame clatter
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);

    // Glass shatter clink
    for (let i = 0; i < 5; i++) {
      const gTime = now + 0.04 + i * 0.03;
      const gOsc = this.ctx.createOscillator();
      const gGain = this.ctx.createGain();
      gOsc.type = 'sine';
      gOsc.frequency.setValueAtTime(1800 + Math.random() * 1200, gTime);
      gGain.gain.setValueAtTime(0.15, gTime);
      gGain.gain.exponentialRampToValueAtTime(0.001, gTime + 0.08);
      gOsc.connect(gGain);
      gGain.connect(this.masterGain);
      gOsc.start(gTime);
      gOsc.stop(gTime + 0.08);
    }
  }

  public playDoorSlam() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Heavy deep boom thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.38);

    // Latch click snap
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(900, now);
    clickGain.gain.setValueAtTime(0.3, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    click.connect(clickGain);
    clickGain.connect(this.masterGain);
    click.start(now);
    click.stop(now + 0.04);
  }

  public playObjectRoll() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const duration = 1.2;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.linearRampToValueAtTime(115, now + 0.6);
    osc.frequency.linearRampToValueAtTime(80, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  public playTVStatic() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const duration = 1.8;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1100, now);

    // High coil whine 15kHz CRT
    const whine = this.ctx.createOscillator();
    const whineGain = this.ctx.createGain();
    whine.type = 'sine';
    whine.frequency.setValueAtTime(3200, now);
    whineGain.gain.setValueAtTime(0.04, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    whine.connect(whineGain);
    whineGain.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    whine.start(now);
    whine.stop(now + duration);
  }

  public playMonsterTorchPetrified() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playBreakerSwitch() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Heavy industrial clunk + electric buzz
    const clunk = this.ctx.createOscillator();
    const clunkGain = this.ctx.createGain();
    clunk.type = 'square';
    clunk.frequency.setValueAtTime(80, now);
    clunk.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    clunkGain.gain.setValueAtTime(0.6, now);
    clunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    clunk.connect(clunkGain);
    clunkGain.connect(this.masterGain);
    clunk.start(now);
    clunk.stop(now + 0.18);

    // Electric spark arc
    const spark = this.ctx.createOscillator();
    const sparkGain = this.ctx.createGain();
    spark.type = 'sawtooth';
    spark.frequency.setValueAtTime(240, now + 0.05);
    spark.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
    sparkGain.gain.setValueAtTime(0.35, now + 0.05);
    sparkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    spark.connect(sparkGain);
    sparkGain.connect(this.masterGain);
    spark.start(now + 0.05);
    spark.stop(now + 0.35);
  }

  public playKeycardBeep() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Dual electronic chime
    [1046.5, 1318.5].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.3, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.18);
    });
  }

  public playPianoChord() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Eerie minor piano chord (A minor chord with reverb decay)
    const chord = [220, 261.63, 329.63, 440, 523.25];
    chord.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.28, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.04);
      osc.stop(now + 2.2);
    });
  }

  public playAltarCleanse() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Arcane resonant tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.6);
    osc.frequency.exponentialRampToValueAtTime(440, now + 1.2);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.4);
  }

  public playAureliaHeartExtract() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Resonant celestial eldritch pulse
    [220, 440, 880].forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.5, now + 1.5);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 2.0);
    });
  }

  public playQuickTurn() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    try {
      // 1. Pivot friction noise burst (shoes rapidly pivoting on hardwood/carpet floor)
      const duration = 0.14;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const env = Math.sin(t * Math.PI) * Math.exp(-t * 7);
        data[i] = (Math.random() * 2 - 1) * env;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(700, now);
      filter.frequency.exponentialRampToValueAtTime(1450, now + 0.05);
      filter.frequency.exponentialRampToValueAtTime(420, now + duration);
      filter.Q.value = 2.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noiseSource.start(now);
      noiseSource.stop(now + duration);

      // 2. Low-frequency rapid weight shift thump
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(105, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.1);

      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch (e) {
      console.warn('Quick turn sound error:', e);
    }
  }
}

export const soundEngine = new SoundEngine();
