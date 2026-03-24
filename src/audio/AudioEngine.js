/**
 * AudioEngine.js — Module-level singleton
 * All synths are created ONCE at import time and shared across all components.
 * This prevents duplicate AudioContexts and audio node exhaustion.
 */
import * as Tone from 'tone';

// ─── EFFECTS ──────────────────────────────────────────────────────────────────

const pianoReverb = new Tone.Reverb({ decay: 1.8, wet: 0.3 }).toDestination();
const guitarDelay  = new Tone.FeedbackDelay('8n', 0.3).toDestination();
const snareFilter  = new Tone.Filter(1800, 'highpass').toDestination();
const hiphopDelay  = new Tone.FeedbackDelay('8n', 0.25);
const hiphopReverb = new Tone.Reverb({ decay: 1.5, wet: 0.2 }).toDestination();
const nobleReverb  = new Tone.Reverb({ decay: 5, wet: 0.6 }).toDestination();
const seqLeadReverb = new Tone.Reverb({ decay: 0.7, wet: 0.15 }).toDestination();

hiphopDelay.connect(hiphopReverb);

// Generate reverb impulse responses (async, fires in background)
Promise.all([
  pianoReverb.generate(),
  hiphopReverb.generate(),
  nobleReverb.generate(),
  seqLeadReverb.generate(),
]).catch(console.warn);

// ─── SYNTHS ───────────────────────────────────────────────────────────────────

/** 🎹 Piano — triangle wave, polyphonic */
export const pianoSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'triangle' },
  envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.2 },
}).connect(pianoReverb);

/** 🎸 Guitar — sawtooth, polyphonic with delay */
export const guitarSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sawtooth' },
  envelope: { attack: 0.01, decay: 0.4, sustain: 0.3, release: 0.8 },
}).connect(guitarDelay);

/** 🥁 Kick — pitch-decaying membrane */
export const kickSynth = new Tone.MembraneSynth({
  pitchDecay: 0.08,
  octaves: 6,
  envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 },
}).toDestination();

/** 🥁 Snare — white noise → highpass */
export const snareSynth = new Tone.NoiseSynth({
  noise: { type: 'white' },
  envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
}).connect(snareFilter);

/** 🥁 Hi-Hat — metallic, short */
export const hihatSynth = new Tone.MetalSynth({
  frequency: 400,
  envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5,
}).toDestination();

/** 🥁 Crash — metallic, long decay */
export const crashSynth = new Tone.MetalSynth({
  frequency: 250,
  envelope: { attack: 0.001, decay: 1.0, release: 0.3 },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 3200,
  octaves: 1.5,
}).toDestination();

/** 🤖 Hip-Hop Air — sawtooth + filter envelope */
export const hiphopSynth = new Tone.MonoSynth({
  oscillator: { type: 'sawtooth' },
  envelope: { attack: 0.1, decay: 0.3, sustain: 1, release: 0.8 },
  filterEnvelope: {
    attack: 0.01, decay: 0.5, sustain: 0.5, release: 2,
    baseFrequency: 200, octaves: 3, exponent: 2,
  },
  portamento: 0.15,
}).connect(hiphopDelay);

/** 👑 Noble Air — fatsawtooth 3-voice unison → cathedral reverb */
export const nobleSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'fatsawtooth', count: 3, spread: 15 },
  envelope: { attack: 0.8, decay: 0.5, sustain: 1, release: 2 },
}).connect(nobleReverb);

/** 🎛 Sequencer Lead — square + filter */
export const seqLeadSynth = new Tone.MonoSynth({
  oscillator: { type: 'square' },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4 },
  filterEnvelope: {
    attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.4,
    baseFrequency: 500, octaves: 2.5,
  },
}).connect(seqLeadReverb);

/** 🎛 Sequencer Bass — sawtooth lowpass */
export const seqBassSynth = new Tone.MonoSynth({
  oscillator: { type: 'sawtooth' },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.3 },
  filter: { Q: 2, type: 'lowpass', rolloff: -12 },
  filterEnvelope: { baseFrequency: 200, octaves: 2 },
}).toDestination();

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

export const PIANO_KEYS = [
  { key: 'a', note: 'C4', type: 'white' },
  { key: 'w', note: 'Db4', type: 'black' },
  { key: 's', note: 'D4', type: 'white' },
  { key: 'e', note: 'Eb4', type: 'black' },
  { key: 'd', note: 'E4', type: 'white' },
  { key: 'f', note: 'F4', type: 'white' },
  { key: 't', note: 'Gb4', type: 'black' },
  { key: 'g', note: 'G4', type: 'white' },
  { key: 'y', note: 'Ab4', type: 'black' },
  { key: 'h', note: 'A4', type: 'white' },
  { key: 'u', note: 'Bb4', type: 'black' },
  { key: 'j', note: 'B4', type: 'white' },
  { key: 'k', note: 'C5', type: 'white' },
];

export const GUITAR_STRINGS = [
  { key: 'z', openNote: 'E2', frets: ['F2','Gb2','G2','Ab2','A2'] },
  { key: 'x', openNote: 'A2', frets: ['Bb2','B2','C3','Db3','D3'] },
  { key: 'c', openNote: 'D3', frets: ['Eb3','E3','F3','Gb3','G3'] },
  { key: 'v', openNote: 'G3', frets: ['Ab3','A3','Bb3','B3','C4'] },
  { key: 'b', openNote: 'B3', frets: ['C4','Db4','D4','Eb4','E4'] },
  { key: 'n', openNote: 'E4', frets: ['F4','Gb4','G4','Ab4','A4'] },
];

export const GUITAR_CHORDS = {
  Am: ['A2','E3','A3','C4','E4'],
  C:  ['C3','E3','G3','C4','E4'],
  G:  ['G2','B2','D3','G3','B3'],
  D:  ['D3','A3','D4','Gb4'],
  Em: ['E2','B2','E3','G3','B3'],
  F:  ['F2','C3','F3','A3','C4'],
};

export const SCALE_HIPHOP = ['C4','Eb4','F4','G4','Bb4','C5','Eb5','F5'];
export const SCALE_NOBLE  = [
  ['C3','G3'],['E3','B3'],['G3','D4'],['A3','E4'],
  ['C4','G4'],['D4','A4'],['E4','B4'],['G4','D5'],
];

export const SEQ_NOTES = ['C3','Eb3','F3','G3','Bb3','C4','Eb4','F4','G4','Bb4','C5','D5','Eb5','F5','G5','Bb5'];
export const SEQ_BASS  = ['C2','Eb2','F2','G2','Bb2','C3','Eb3','F3','G3','Bb3','C4','D4','Eb4','F4','G4','Bb4'];

export const TWINKLE = [
  { note:'C4', key:'a' }, { note:'C4', key:'a' }, { note:'G4', key:'g' }, { note:'G4', key:'g' },
  { note:'A4', key:'h' }, { note:'A4', key:'h' }, { note:'G4', key:'g' }, { note:'F4', key:'f' },
  { note:'F4', key:'f' }, { note:'E4', key:'d' }, { note:'E4', key:'d' }, { note:'D4', key:'s' },
  { note:'D4', key:'s' }, { note:'C4', key:'a' },
];

export const SEQ_PRESETS = {
  'Boom Bap': {
    kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
    bass:  [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0],
    lead:  [0,0,0,0, 0,1,0,0, 0,0,0,1, 0,0,1,0],
  },
  Trap: {
    kick:  [1,0,0,0, 1,0,0,0, 0,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    bass:  [1,0,1,0, 0,0,0,0, 1,0,0,0, 0,1,0,0],
    lead:  [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,1,0,0],
  },
  House: {
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    hihat: [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1],
    bass:  [1,0,0,0, 0,1,0,0, 1,0,0,0, 0,0,1,0],
    lead:  [0,0,1,0, 0,0,0,1, 0,1,0,0, 0,0,0,1],
  },
  'Lo-Fi': {
    kick:  [1,0,0,0, 0,0,1,1, 0,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,0, 0,1,0,0, 1,0,1,0, 0,1,0,1],
    bass:  [1,0,0,0, 1,0,0,0, 0,0,1,0, 0,1,0,0],
    lead:  [0,1,0,0, 0,0,0,1, 0,0,0,0, 1,0,0,0],
  },
};

/** Helper: start Tone audio context if not running */
export async function initAudio() {
  if (Tone.context.state !== 'running') {
    await Tone.start();
  }
}
