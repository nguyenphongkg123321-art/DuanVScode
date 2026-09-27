import { getData, saveSettings } from './storage.js';

export const MUSIC_TRACKS = [
  { id: 'neon-drive', name: 'Đường Đua Neon', group: 'SÔI ĐỘNG' },
  { id: 'pixel-rush', name: 'Bứt Phá Điểm Ảnh', group: 'SÔI ĐỘNG' },
  { id: 'midnight-grid', name: 'Lưới Đêm', group: 'THƯ GIÃN' },
  { id: 'rainy-cafe', name: 'Quán Cà Phê Mưa', group: 'THƯ GIÃN' },
  { id: 'lofi-garden', name: 'Khu Vườn Lofi', group: 'THƯ GIÃN' },
  { id: 'afterglow', name: 'Dư Âm', group: 'THƯ GIÃN' },
];

const trackPatterns = {
  'neon-drive': {
    interval: 310,
    wave: 'triangle',
    melody: [261.63, null, 329.63, 392, null, 329.63, 293.66, null, 261.63, 329.63, 440, 392, null, 329.63, 293.66, null],
    bass: [65.41, 82.41, 98, 73.42],
  },
  'pixel-rush': {
    interval: 215,
    wave: 'square',
    melody: [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, null, 783.99, 659.25, 587.33, 659.25, 523.25, null, 392, 493.88],
    bass: [130.81, 146.83, 174.61, 123.47],
  },
  'midnight-grid': {
    interval: 480,
    wave: 'sine',
    melody: [220, null, 261.63, null, 329.63, 293.66, null, 246.94, 196, null, 246.94, null, 293.66, 261.63, null, 220],
    bass: [55, 65.41, 49, 61.74],
  },
  'rainy-cafe': {
    interval: 560,
    wave: 'sine',
    melody: [261.63, null, 311.13, 349.23, null, 311.13, 233.08, null, 261.63, 293.66, null, 349.23, 311.13, null, 261.63, null],
    bass: [65.41, 58.27, 69.3, 52],
  },
  'lofi-garden': {
    interval: 430,
    wave: 'triangle',
    melody: [196, 246.94, null, 293.66, 329.63, null, 293.66, 246.94, 220, null, 261.63, 293.66, null, 246.94, 220, null],
    bass: [49, 55, 65.41, 58.27],
  },
  afterglow: {
    interval: 620,
    wave: 'sine',
    melody: [329.63, null, 392, null, 493.88, 440, null, 392, 293.66, null, 369.99, null, 440, 392, null, 329.63],
    bass: [82.41, 73.42, 61.74, 65.41],
  },
};

class SoundManager {
  constructor() {
    const settings = getData().settings;
    this.enabled = settings.soundEnabled;
    this.volume = settings.volume;
    this.track = trackPatterns[settings.musicTrack] ? settings.musicTrack : 'neon-drive';
    this.context = null;
    this.musicTimer = null;
    this.noteIndex = 0;
  }

  ensureContext() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.context = new AudioContext();
    }
    if (this.context?.state === 'suspended') this.context.resume();
    return this.context;
  }

  tone(frequency, duration = 0.08, type = 'sine', gainScale = 1) {
    if (!this.enabled) return;
    const context = this.ensureContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(Math.max(0.001, this.volume * gainScale), context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  click() { this.tone(420, 0.055, 'triangle', 0.35); }
  whoosh() {
    if (!this.enabled) return;
    const context = this.ensureContext();
    if (!context) return;
    const duration = 0.16;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      const fade = 1 - index / channel.length;
      channel[index] = (Math.random() * 2 - 1) * fade * fade;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1250, context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(260, context.currentTime + duration);
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(Math.max(0.001, this.volume * 0.22), context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
    source.stop(context.currentTime + duration);
    this.tone(190, 0.09, 'sine', 0.12);
  }
  blockBreak(combo = 1, lines = 1) {
    if (!this.enabled) return;
    const context = this.ensureContext();
    if (!context) return;
    const duration = 0.24;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      const progress = index / channel.length;
      channel[index] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 2.8);
    }
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800 + lines * 240, context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(380, context.currentTime + duration);
    filter.Q.value = 0.85;
    noiseGain.gain.setValueAtTime(Math.max(0.001, this.volume * 0.32), context.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    noise.buffer = buffer;
    noise.connect(filter).connect(noiseGain).connect(context.destination);
    noise.start();
    noise.stop(context.currentTime + duration);

    const impact = context.createOscillator();
    const impactGain = context.createGain();
    impact.type = 'sine';
    impact.frequency.setValueAtTime(105 + lines * 14, context.currentTime);
    impact.frequency.exponentialRampToValueAtTime(42, context.currentTime + .2);
    impactGain.gain.setValueAtTime(Math.max(0.001, this.volume * .34), context.currentTime);
    impactGain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .22);
    impact.connect(impactGain).connect(context.destination);
    impact.start(); impact.stop(context.currentTime + .23);

    const baseNote = 480 + Math.min(combo, 6) * 45;
    const notes = lines > 1 ? [baseNote, baseNote * 1.25, baseNote * 1.5] : [baseNote, baseNote * 1.25];
    notes.forEach((note, index) => setTimeout(() => this.tone(note, .11, 'triangle', .32), index * 58));
  }
  score() { this.tone(740, 0.1, 'sine', 0.45); setTimeout(() => this.tone(980, 0.12, 'sine', 0.4), 65); }
  win() { [523, 659, 784].forEach((note, index) => setTimeout(() => this.tone(note, 0.22, 'triangle', 0.45), index * 110)); }
  gameOver() { this.tone(240, 0.25, 'sawtooth', 0.3); setTimeout(() => this.tone(150, 0.35, 'sawtooth', 0.25), 170); }

  startMusic() {
    if (!this.enabled || this.musicTimer) return;
    const pattern = trackPatterns[this.track];
    this.playMusicStep();
    this.musicTimer = setInterval(() => this.playMusicStep(), pattern.interval);
  }

  playMusicStep() {
    const pattern = trackPatterns[this.track];
    const step = this.noteIndex % pattern.melody.length;
    const note = pattern.melody[step];
    if (note) this.tone(note, pattern.interval / 1000 * 0.82, pattern.wave, 0.038);
    if (step % 4 === 0) {
      const bassNote = pattern.bass[Math.floor(step / 4) % pattern.bass.length];
      this.tone(bassNote, pattern.interval / 1000 * 2.8, 'sine', 0.045);
    }
    this.noteIndex += 1;
  }

  stopMusic() {
    clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) this.startMusic(); else this.stopMusic();
    saveSettings({ soundEnabled: enabled });
  }

  setVolume(volume) {
    this.volume = Number(volume);
    saveSettings({ volume: this.volume });
  }

  setTrack(trackId) {
    if (!trackPatterns[trackId] || trackId === this.track) return;
    const wasPlaying = Boolean(this.musicTimer);
    this.stopMusic();
    this.track = trackId;
    this.noteIndex = 0;
    if (wasPlaying || this.enabled) this.startMusic();
    saveSettings({ musicTrack: trackId });
  }
}

export const sound = new SoundManager();
