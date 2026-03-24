import React, { useState, useEffect, useRef, useCallback } from 'react';
import { pianoSynth, TWINKLE, initAudio } from '../audio/AudioEngine.js';

// Notes mapped to keys
const KEY_NOTE_MAP = {
  a: 'C4', s: 'D4', d: 'E4', f: 'F4', g: 'G4', h: 'A4',
};
const NOTE_KEY_MAP = Object.fromEntries(Object.entries(KEY_NOTE_MAP).map(([k, v]) => [v, k]));

const LANE_KEYS  = ['a','s','d','f','g','h'];
const LANE_NOTES = LANE_KEYS.map(k => KEY_NOTE_MAP[k]);
const NOTE_SPEED = 280; // px per second
const HIT_Y      = 310; // px from top (hit zone centre)
const PERFECT_MS = 160;
const GOOD_MS    = 320;
const SPAWN_LEAD = 1500; // ms before note should be hit, when it spawns

export default function TrainingMode() {
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [finished, setFinished] = useState(false);
  const [totalPossible, setTotalPossible] = useState(0);

  // Each falling note: { id, note, key, laneIdx, spawnTime, hitTime (scheduled) }
  const [fallingNotes, setFallingNotes] = useState([]);
  const [flashes, setFlashes] = useState({}); // laneIdx -> 'perfect'|'good'|'miss'

  const startTimeRef  = useRef(0);
  const songRef       = useRef([]);
  const nextNoteIdxRef = useRef(0);
  const rafRef        = useRef(null);
  const comboRef      = useRef(0);
  const frameRef      = useRef(null);

  // ─── TICK: advance falling notes in RAF ───────────────────────────────────
  const tick = useCallback(() => {
    const now = Date.now();
    const elapsed = now - startTimeRef.current;

    // Spawn new notes whose hitTime is approaching within SPAWN_LEAD ms
    const song = songRef.current;
    let idx = nextNoteIdxRef.current;
    while (idx < song.length && song[idx].hitTime - elapsed <= SPAWN_LEAD) {
      const n = song[idx];
      const li = LANE_NOTES.indexOf(n.note);
      if (li !== -1) {
        setFallingNotes(prev => [...prev, {
          id: `${n.note}-${idx}`,
          note: n.note,
          key: NOTE_KEY_MAP[n.note],
          laneIdx: li,
          spawnTime: now,
          hitTime: startTimeRef.current + n.hitTime,
        }]);
      }
      idx++;
    }
    nextNoteIdxRef.current = idx;

    // Auto-miss notes that passed hit zone > GOOD_MS ago
    setFallingNotes(prev => {
      const nowInner = Date.now();
      const remaining = prev.filter(n => nowInner - n.hitTime < GOOD_MS + 200);
      const missed = prev.filter(n => nowInner - n.hitTime >= GOOD_MS + 200);
      if (missed.length > 0) {
        setCombo(0); comboRef.current = 0;
        missed.forEach(n => flashLane(n.laneIdx, 'miss'));
      }
      return remaining;
    });

    // End of song
    if (idx >= song.length && fallingNotes.length === 0) {
      // give a grace period
    }

    frameRef.current = requestAnimationFrame(tick);
  }, [fallingNotes.length]);

  const flashLane = (laneIdx, type) => {
    setFlashes(f => ({ ...f, [laneIdx]: type }));
    setTimeout(() => setFlashes(f => { const n = {...f}; delete n[laneIdx]; return n; }), 300);
  };

  // ─── START ─────────────────────────────────────────────────────────────────
  const startTraining = useCallback(async () => {
    await initAudio();
    // Space notes 600ms apart
    const song = TWINKLE.map((n, i) => ({ ...n, hitTime: 1000 + i * 600 }));
    songRef.current = song;
    setTotalPossible(song.length * 100 * 4); // max: all perfect at 4× combo
    startTimeRef.current = Date.now();
    nextNoteIdxRef.current = 0;
    setFallingNotes([]);
    setScore(0); setCombo(0); comboRef.current = 0;
    setFeedback(''); setFinished(false);
    setStarted(true);
    frameRef.current = requestAnimationFrame(tick);

    // Auto-finish after all notes
    const totalDuration = 1000 + (TWINKLE.length * 600) + 2000;
    setTimeout(() => {
      cancelAnimationFrame(frameRef.current);
      setFallingNotes([]);
      setFinished(true);
      setStarted(false);
    }, totalDuration);
  }, [tick]);

  // ─── KEY HIT ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    const down = (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (!LANE_KEYS.includes(key)) return;
      const note = KEY_NOTE_MAP[key];
      const laneIdx = LANE_KEYS.indexOf(key);
      const now = Date.now();

      // Find closest matching note in this lane
      setFallingNotes(prev => {
        const target = prev
          .filter(n => n.note === note)
          .sort((a, b) => Math.abs(now - a.hitTime) - Math.abs(now - b.hitTime))[0];

        if (!target) return prev;
        const diff = Math.abs(now - target.hitTime);
        let type, pts;
        if (diff <= PERFECT_MS) { type = 'perfect'; pts = 100; }
        else if (diff <= GOOD_MS) { type = 'good'; pts = 60; }
        else return prev; // too early

        comboRef.current = Math.min(comboRef.current + 1, 4);
        setCombo(comboRef.current);
        setScore(s => s + pts * comboRef.current);
        setFeedback(type === 'perfect' ? '✨ PERFECT!' : '👍 GOOD');
        setTimeout(() => setFeedback(''), 600);
        flashLane(laneIdx, type);

        // Play the note
        pianoSynth.triggerAttackRelease(note, '8n');
        return prev.filter(n => n.id !== target.id);
      });
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [started]);

  // Cleanup on unmount
  useEffect(() => () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); }, []);

  // ─── GRADE ────────────────────────────────────────────────────────────────
  const pct = totalPossible ? Math.min(100, Math.round((score / totalPossible) * 100 * 4)) : 0;
  const grade = pct >= 95 ? 'S' : pct >= 80 ? 'A' : pct >= 65 ? 'B' : pct >= 50 ? 'C' : 'F';
  const gradeColor = { S:'#ffd700', A:'#00d4ff', B:'#4ade80', C:'#facc15', F:'#f43f5e' }[grade];

  const LANE_W = 100 / LANE_KEYS.length; // %

  return (
    <div className="trainer-wrap">
      <div className="trainer-header">
        <button className="trainer-start-btn" onClick={startTraining} disabled={started}>
          {started ? 'PLAYING…' : '▶ START — Twinkle Twinkle'}
        </button>
        <span className="trainer-score">Score: {score}</span>
        <span className="trainer-combo" style={{ opacity: combo > 1 ? 1 : 0 }}>
          🔥 x{combo} COMBO
        </span>
      </div>

      <p className="section-title" style={{ marginBottom: 8 }}>
        Keys: A S D F G H &nbsp;·&nbsp; Hit notes as they cross the line
      </p>

      {/* Grade screen */}
      {finished ? (
        <div className="grade-screen">
          <div className="grade-letter" style={{ color: gradeColor }}>{grade}</div>
          <p style={{ fontFamily: 'var(--font-display)', color: 'var(--muted)', marginTop: 12 }}>
            Final Score: {score} &nbsp;·&nbsp; {pct}%
          </p>
          <button className="trainer-start-btn" style={{ marginTop: 20 }} onClick={startTraining}>
            TRY AGAIN
          </button>
        </div>
      ) : (
        <>
          {/* Lane */}
          <div className="trainer-lane-wrap">
            {/* Dividers */}
            {LANE_KEYS.map((_, i) => (
              <div key={i} className="lane-divider" style={{ left: `${(i+1) * LANE_W}%` }} />
            ))}

            {/* Hit zone line */}
            <div className="hit-zone" />

            {/* Key labels */}
            {LANE_KEYS.map((k, i) => (
              <div key={k} className="lane-key-label" style={{ left: `${i * LANE_W + LANE_W/2 - 5}%` }}>
                {k.toUpperCase()}
              </div>
            ))}

            {/* Flash overlays */}
            {LANE_KEYS.map((_, i) => flashes[i] && (
              <div
                key={i}
                className={`hit-flash ${flashes[i]}`}
                style={{ left: `${i * LANE_W}%`, width: `${LANE_W}%` }}
              />
            ))}

            {/* Falling notes */}
            {fallingNotes.map(n => {
              const now = Date.now();
              const msUntilHit = n.hitTime - now;
              const topPx = HIT_Y - (msUntilHit / 1000) * NOTE_SPEED;
              return (
                <div
                  key={n.id}
                  className="falling-note"
                  style={{
                    top: `${topPx}px`,
                    left: `${n.laneIdx * LANE_W + 1}%`,
                    width: `${LANE_W - 2}%`,
                  }}
                >
                  {n.note}
                </div>
              );
            })}
          </div>

          {/* Feedback */}
          <div className="trainer-feedback" style={{
            color: feedback.includes('PERFECT') ? 'var(--cyan)' : 'var(--green)',
          }}>
            {feedback}
          </div>
        </>
      )}
    </div>
  );
}
