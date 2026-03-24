import React, { useState, useEffect, useCallback } from 'react';
import { guitarSynth, GUITAR_STRINGS, GUITAR_CHORDS, initAudio } from '../audio/AudioEngine.js';

export default function Guitar({ onNote }) {
  const [vibrating, setVibrating] = useState(new Set());
  const [pressedChord, setPressedChord] = useState(null);
  const [pressedFret, setPressedFret] = useState(null);

  const playNote = useCallback(async (note, stringIdx) => {
    await initAudio();
    guitarSynth.triggerAttackRelease(note, '4n');
    setVibrating(v => new Set(v).add(stringIdx));
    setTimeout(() => setVibrating(v => { const n = new Set(v); n.delete(stringIdx); return n; }), 400);
    onNote?.(note);
  }, [onNote]);

  const strumChord = useCallback(async (chordName) => {
    await initAudio();
    setPressedChord(chordName);
    const notes = GUITAR_CHORDS[chordName];
    notes.forEach((note, i) => {
      setTimeout(() => {
        guitarSynth.triggerAttackRelease(note, '2n');
        onNote?.(note);
      }, i * 35);
    });
    GUITAR_STRINGS.forEach((_, i) => {
      setTimeout(() => {
        setVibrating(v => new Set(v).add(i));
        setTimeout(() => setVibrating(v => { const n = new Set(v); n.delete(i); return n; }), 400);
      }, i * 35);
    });
    setTimeout(() => setPressedChord(null), 500);
  }, [onNote]);

  useEffect(() => {
    const down = (e) => {
      if (e.repeat) return;
      const str = GUITAR_STRINGS.find(s => s.key === e.key.toLowerCase());
      if (str) playNote(str.openNote, GUITAR_STRINGS.indexOf(str));
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [playNote]);

  return (
    <div className="guitar-wrap">
      <p className="section-title">Click frets or chord buttons · Keys Z X C V B N</p>
      <div className="guitar-fretboard">
        {GUITAR_STRINGS.map((str, si) => (
          <div key={str.openNote} className="guitar-string-row">
            {/* Open string label */}
            <div
              className={`string-label ${vibrating.has(si) ? 'vibrating' : ''}`}
              onMouseDown={() => playNote(str.openNote, si)}
              title={`Key: ${str.key.toUpperCase()}`}
            >
              {str.openNote}<br />
              <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>{str.key.toUpperCase()}</span>
            </div>

            {/* Fret buttons with string wire behind them */}
            <div className="string-line" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              {/* Wire */}
              <div
                className={`string-wire ${vibrating.has(si) ? 'vibrating' : ''}`}
                style={{
                  height: `${5 - si * 0.6}px`,
                  position: 'absolute', left: 0, right: 0,
                }}
              />
              {str.frets.map((note, fi) => (
                <button
                  key={note}
                  className={`fret-btn ${pressedFret === `${si}-${fi}` ? 'pressed' : ''}`}
                  onMouseDown={() => {
                    setPressedFret(`${si}-${fi}`);
                    playNote(note, si);
                    setTimeout(() => setPressedFret(null), 200);
                  }}
                  title={note}
                >
                  {note}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Chord Buttons */}
      <div className="guitar-chord-row">
        {Object.keys(GUITAR_CHORDS).map(chord => (
          <button
            key={chord}
            className={`chord-btn ${pressedChord === chord ? 'pressed' : ''}`}
            onMouseDown={() => strumChord(chord)}
          >
            {chord}
          </button>
        ))}
      </div>
    </div>
  );
}
