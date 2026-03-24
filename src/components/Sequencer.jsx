import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import {
  kickSynth, snareSynth, hihatSynth, seqLeadSynth, seqBassSynth,
  SEQ_NOTES, SEQ_BASS, SEQ_PRESETS, initAudio
} from '../audio/AudioEngine.js';

const TRACKS = [
  { id: 'kick',  label: 'KICK' },
  { id: 'snare', label: 'SNARE' },
  { id: 'hihat', label: 'HI-HAT' },
  { id: 'bass',  label: 'BASS' },
  { id: 'lead',  label: 'LEAD' },
];

const EMPTY_GRID = () => TRACKS.map(() => Array(16).fill(0));

function applyPreset(name) {
  const p = SEQ_PRESETS[name];
  if (!p) return EMPTY_GRID();
  return TRACKS.map(t => p[t.id] ? [...p[t.id]] : Array(16).fill(0));
}

export default function Sequencer() {
  const [grid, setGrid] = useState(applyPreset('Boom Bap'));
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(90);
  const [swing, setSwing] = useState(0);
  const [muted, setMuted] = useState(new Set());

  const gridRef = useRef(grid);
  const mutedRef = useRef(muted);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // BPM / swing updates
  useEffect(() => { Tone.getTransport().bpm.value = bpm; }, [bpm]);
  useEffect(() => {
    Tone.getTransport().swing = swing;
    Tone.getTransport().swingSubdivision = '16n';
  }, [swing]);

  const stepRef = useRef(0);

  const startSeq = useCallback(async () => {
    await initAudio();
    stepRef.current = 0;

    Tone.getTransport().cancel();
    Tone.getTransport().scheduleRepeat((time) => {
      const step = stepRef.current;
      const g = gridRef.current;
      const m = mutedRef.current;

      if (g[0][step] && !m.has('kick'))  kickSynth.triggerAttackRelease('C1', '8n', time);
      if (g[1][step] && !m.has('snare')) snareSynth.triggerAttackRelease('8n', time);
      if (g[2][step] && !m.has('hihat')) hihatSynth.triggerAttackRelease('16n', time);
      if (g[3][step] && !m.has('bass'))  seqBassSynth.triggerAttackRelease(SEQ_BASS[step], '8n', time);
      if (g[4][step] && !m.has('lead'))  seqLeadSynth.triggerAttackRelease(SEQ_NOTES[step], '16n', time);

      Tone.getDraw().schedule(() => setCurrentStep(step), time);
      stepRef.current = (step + 1) % 16;
    }, '16n');

    Tone.getTransport().start();
    setPlaying(true);
  }, []);

  const stopSeq = useCallback(() => {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    setPlaying(false);
    setCurrentStep(-1);
    stepRef.current = 0;
  }, []);

  const toggleStep = (ti, si) => {
    setGrid(g => {
      const ng = g.map(r => [...r]);
      ng[ti][si] = ng[ti][si] ? 0 : 1;
      return ng;
    });
  };

  const toggleMute = (id) => {
    setMuted(m => {
      const n = new Set(m);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const randomize = () => {
    const density = { kick: 0.3, snare: 0.3, hihat: 0.6, bass: 0.4, lead: 0.4 };
    setGrid(TRACKS.map(t => Array(16).fill(0).map(() => Math.random() < density[t.id] ? 1 : 0)));
  };

  return (
    <div className="seq-wrap">
      {/* Header */}
      <div className="seq-header">
        <div className="seq-transport">
          <button
            className={`seq-play-btn ${playing ? 'playing' : ''}`}
            onClick={playing ? stopSeq : startSeq}
          >
            {playing ? '■ STOP' : '▶ PLAY'}
          </button>

          <div className="seq-bpm-wrap">
            <label>BPM</label>
            <input type="range" min="60" max="200" value={bpm} onChange={e => setBpm(+e.target.value)} />
            <span className="seq-bpm-display">{bpm}</span>
          </div>

          <div className="seq-bpm-wrap">
            <label>SWING</label>
            <input type="range" min="0" max="0.5" step="0.01" value={swing} onChange={e => setSwing(+e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="seq-presets">
            {Object.keys(SEQ_PRESETS).map(name => (
              <button key={name} className="seq-preset-btn" onClick={() => setGrid(applyPreset(name))}>
                {name}
              </button>
            ))}
          </div>
          <button className="seq-randomize-btn" onClick={randomize}>🎲 RANDOM</button>
          <button className="seq-preset-btn" onClick={() => setGrid(EMPTY_GRID())}>CLR</button>
        </div>
      </div>

      {/* Grid */}
      <div className="seq-grid">
        {TRACKS.map((track, ti) => (
          <div key={track.id} className={`seq-track-row ${track.id}`}>
            <div
              className={`seq-track-label ${muted.has(track.id) ? 'muted' : ''}`}
              onClick={() => toggleMute(track.id)}
              title="Click to mute/unmute"
            >
              {track.label}
            </div>
            {grid[ti].map((on, si) => (
              <div
                key={si}
                className={[
                  'seq-step',
                  on ? 'on' : '',
                  si % 4 === 0 ? 'beat4' : '',
                  currentStep === si ? 'active-step' : '',
                ].join(' ')}
                onClick={() => toggleStep(ti, si)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
