import React, { useState, useEffect, useCallback } from 'react';
import { kickSynth, snareSynth, hihatSynth, crashSynth, initAudio } from '../audio/AudioEngine.js';

const PADS = [
  { id: 'kick',  label: 'KICK',   key: 'q', color: '#f43f5e', synth: kickSynth,  note: 'C1',  dur: '8n' },
  { id: 'snare', label: 'SNARE',  key: 'w', color: '#00d4ff', synth: snareSynth, note: null,  dur: '8n' },
  { id: 'hihat', label: 'HI-HAT', key: 'e', color: '#facc15', synth: hihatSynth, note: null,  dur: '16n' },
  { id: 'crash', label: 'CRASH',  key: 'r', color: '#4ade80', synth: crashSynth, note: null,  dur: '8n' },
];

const PRESETS = {
  'Basic Beat': ['kick','snare','kick','snare'],
  'Hi-Hat Roll': ['hihat','hihat','hihat','hihat','hihat','hihat','hihat','hihat'],
  'Crash!': ['crash'],
};

export default function Drums({ onNote }) {
  const [hitting, setHitting] = useState(new Set());

  const hitPad = useCallback(async (pad) => {
    await initAudio();
    if (pad.id === 'kick') pad.synth.triggerAttackRelease(pad.note, pad.dur);
    else pad.synth.triggerAttackRelease(pad.dur);

    setHitting(h => new Set(h).add(pad.id));
    setTimeout(() => setHitting(h => { const n = new Set(h); n.delete(pad.id); return n; }), 150);
    onNote?.(pad.id);
  }, [onNote]);

  useEffect(() => {
    const down = (e) => {
      if (e.repeat) return;
      const pad = PADS.find(p => p.key === e.key.toLowerCase());
      if (pad) hitPad(pad);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [hitPad]);

  const runPreset = useCallback(async (pattern) => {
    await initAudio();
    pattern.forEach((padId, i) => {
      setTimeout(() => {
        const pad = PADS.find(p => p.id === padId);
        if (pad) hitPad(pad);
      }, i * 200);
    });
  }, [hitPad]);

  return (
    <div>
      <p className="section-title">Keys Q W E R · Click pads</p>
      <div className="drums-wrap">
        {PADS.map(pad => (
          <div
            key={pad.id}
            className={`drum-pad ${hitting.has(pad.id) ? 'hit' : ''}`}
            style={{
              border: `4px solid ${pad.color}`,
              color: hitting.has(pad.id) ? pad.color : '#fff',
              boxShadow: hitting.has(pad.id)
                ? `0 0 40px ${pad.color}, inset 0 0 20px ${pad.color}33`
                : `0 0 0 0 transparent`,
              background: hitting.has(pad.id)
                ? `radial-gradient(circle at 40% 40%, ${pad.color}33, #0a0e1a)`
                : 'radial-gradient(circle at 35% 35%, #1e293b, #0a0e1a)',
            }}
            onMouseDown={() => hitPad(pad)}
            onTouchStart={(e) => { e.preventDefault(); hitPad(pad); }}
          >
            <h3 style={{ color: pad.color }}>{pad.label}</h3>
            <span className="pad-key" style={{ color: pad.color }}>KEY: {pad.key.toUpperCase()}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
        {Object.entries(PRESETS).map(([name, pattern]) => (
          <button
            key={name}
            className="chord-btn"
            onMouseDown={() => runPreset(pattern)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
