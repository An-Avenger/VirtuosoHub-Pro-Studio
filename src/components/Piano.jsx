import React, { useState, useEffect, useCallback } from 'react';
import { pianoSynth, PIANO_KEYS, initAudio } from '../audio/AudioEngine.js';
import * as Tone from 'tone';

export default function Piano({ onNote }) {
  const [pressed, setPressed] = useState(new Set());

  const playNote = useCallback(async (note) => {
    await initAudio();
    pianoSynth.triggerAttackRelease(note, '8n');
    setPressed(p => new Set(p).add(note));
    setTimeout(() => setPressed(p => { const n = new Set(p); n.delete(note); return n; }), 180);
    onNote?.(note);
  }, [onNote]);

  useEffect(() => {
    const down = (e) => {
      if (e.repeat) return;
      const k = PIANO_KEYS.find(k => k.key === e.key.toLowerCase());
      if (k) playNote(k.note);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [playNote]);

  // Build display order: interleave black keys into white key positions
  return (
    <div>
      <p className="section-title">Click or use keyboard hotkeys</p>
      <div className="piano-wrap">
        {PIANO_KEYS.map((k) => (
          <div
            key={k.note}
            className={`piano-key ${k.type} ${pressed.has(k.note) ? 'pressed' : ''}`}
            onMouseDown={() => playNote(k.note)}
            onTouchStart={(e) => { e.preventDefault(); playNote(k.note); }}
            title={k.note}
          >
            <div className="piano-key-label">{k.key.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
