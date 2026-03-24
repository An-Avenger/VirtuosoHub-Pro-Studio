import AirInstrument from "./AirInstrument";
import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

/* --- 🎨 STYLES & ANIMATIONS --- */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Poppins:wght@300;400;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap');

  body {
    background: radial-gradient(circle at 50% 10%, #0f0c29 0%, #302b63 50%, #24243e 100%);
    overflow-x: hidden;
    margin: 0;
  }

  /* Glass Panel Container */
  .glass-panel {
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(15px);
    border: 1px solid rgba(56, 189, 248, 0.2);
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
    border-radius: 20px;
    padding: 30px;
    margin: 20px auto;
    width: 90%;
    max-width: 1400px;
    min-height: 500px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
`;

/* --- 🎵 CONFIGURATION --- */
const PIANO_KEYS = [
  { key: "a", note: "C4", type: "white" },
  { key: "w", note: "C#4", type: "black" },
  { key: "s", note: "D4", type: "white" },
  { key: "e", note: "D#4", type: "black" },
  { key: "d", note: "E4", type: "white" },
  { key: "f", note: "F4", type: "white" },
  { key: "t", note: "F#4", type: "black" },
  { key: "g", note: "G4", type: "white" },
  { key: "y", note: "G#4", type: "black" },
  { key: "h", note: "A4", type: "white" },
  { key: "u", note: "A#4", type: "black" },
  { key: "j", note: "B4", type: "white" },
  { key: "k", note: "C5", type: "white" }
];

const DRUM_PADS = [
  { key: "z", id: "kick", label: "KICK", color: "#f43f5e" },
  { key: "x", id: "snare", label: "SNARE", color: "#38bdf8" },
  { key: "c", id: "hihat", label: "HI-HAT", color: "#facc15" },
  { key: "v", id: "crash", label: "CRASH", color: "#4ade80" }
];

const GUITAR_STRINGS = [
  { key: "z", note: "E2", thickness: 5 }, { key: "x", note: "A2", thickness: 4.5 },
  { key: "c", note: "D3", thickness: 4 }, { key: "v", note: "G3", thickness: 3.5 },
  { key: "b", note: "B3", thickness: 3 }, { key: "n", note: "E4", thickness: 2 }
];

const TRAINING_SONGS = {
  twinkle: [{ note: "C4", time: 1000 }, { note: "C4", time: 1500 }, { note: "G4", time: 2000 }, { note: "G4", time: 2500 }, { note: "A4", time: 3000 }, { note: "A4", time: 3500 }, { note: "G4", time: 4000 }],
  scale: [{ note: "E2", time: 1000 }, { note: "A2", time: 1500 }, { note: "D3", time: 2000 }, { note: "G3", time: 2500 }, { note: "B3", time: 3000 }, { note: "E4", time: 3500 }],
  beat: [{ note: "kick", time: 1000 }, { note: "snare", time: 1500 }, { note: "kick", time: 2000 }, { note: "snare", time: 2500 }, { note: "kick", time: 3000 }, { note: "snare", time: 3500 }, { note: "crash", time: 4000 }]
};

function App() {
  const [instrument, setInstrument] = useState("piano");
  const [airMode, setAirMode] = useState("hiphop"); 
  const [recording, setRecording] = useState(false);
  const [events, setEvents] = useState([]);
  const [startTime, setStartTime] = useState(0);
  const [activeKey, setActiveKey] = useState(null);
  
  const [trainingActive, setTrainingActive] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [nextNote, setNextNote] = useState(null);
  const trainingStartTime = useRef(0);
  const currentSongRef = useRef([]);

  const pianoRef = useRef(null);
  const guitarRef = useRef(null);
  const violinRef = useRef(null);
  const fluteRef = useRef(null);
  const kickRef = useRef(null);
  const snareRef = useRef(null);
  const hihatRef = useRef(null);
  const crashRef = useRef(null);

  useEffect(() => {
    pianoRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
    guitarRef.current = new Tone.PolySynth(Tone.AMSynth).toDestination();
    violinRef.current = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsawtooth" }, envelope: { attack: 0.2, sustain: 1, release: 1 } }).toDestination();
    fluteRef.current = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.1, sustain: 1, release: 0.5 } }).toDestination();
    kickRef.current = new Tone.MembraneSynth().toDestination();
    snareRef.current = new Tone.NoiseSynth().toDestination();
    hihatRef.current = new Tone.MetalSynth().toDestination();
    crashRef.current = new Tone.MetalSynth({ decay: 1 }).toDestination();
    
    return () => { [pianoRef, guitarRef, violinRef, fluteRef, kickRef, snareRef, hihatRef, crashRef].forEach(ref => ref.current?.dispose()); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
        if(e.repeat || instrument === "air") return;
        const key = e.key.toLowerCase();
        let note = null;

        if (instrument === "drums") {
            const pad = DRUM_PADS.find(p => p.key === key);
            if(pad) note = pad.id;
        } else if (instrument === "guitar") {
            const str = GUITAR_STRINGS.find(s => s.key === key);
            if(str) note = str.note;
            else { 
                const p = PIANO_KEYS.find(k => k.key === key); 
                if(p) note = p.note; 
            }
        } else {
            const p = PIANO_KEYS.find(k => k.key === key);
            if(p) note = p.note;
        }
        if(note) playSound(note);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [instrument]);

  const startTraining = (songKey) => {
    setTrainingActive(true);
    setScore(0);
    setFeedback("Get Ready...");
    currentSongRef.current = [...TRAINING_SONGS[songKey]];
    trainingStartTime.current = Date.now();
    setNextNote(currentSongRef.current[0]?.note || null);
  };

  const advanceSong = () => {
    currentSongRef.current.shift();
    if (!currentSongRef.current.length) {
      setFeedback("🎉 FINISHED!");
      setTrainingActive(false);
      setNextNote(null);
      return;
    }
    setNextNote(currentSongRef.current[0].note);
  };

  const checkAccuracy = (note) => {
    if (!trainingActive || !currentSongRef.current.length) return;
    const expected = currentSongRef.current[0];
    if (note === expected.note) {
      setScore(s => s + 100);
      advanceSong();
    }
  };

  const playSound = async (note) => {
    if (Tone.context.state !== 'running') await Tone.start();
    setActiveKey(note);
    setTimeout(() => setActiveKey(null), 150);

    if (trainingActive) checkAccuracy(note);

    if (instrument === "piano") pianoRef.current?.triggerAttackRelease(note, "8n");
    if (instrument === "guitar") guitarRef.current?.triggerAttackRelease(note, "8n");
    if (instrument === "violin") violinRef.current?.triggerAttackRelease(note, "2n");
    if (instrument === "flute") fluteRef.current?.triggerAttackRelease(note, "4n");
    if (instrument === "drums") {
       if (note==="kick") kickRef.current?.triggerAttackRelease("C1","8n");
       if (note==="snare") snareRef.current?.triggerAttackRelease("8n");
       if (note==="hihat") hihatRef.current?.triggerAttackRelease("16n");
       if (note==="crash") crashRef.current?.triggerAttackRelease("16n");
    }

    if (recording) setEvents(prev => [...prev, { note, time: Date.now()-startTime, instrument }]);
  };

  const replay = () => { events.forEach(e => setTimeout(() => playSound(e.note), e.time)); };
  const saveSong = async () => {
      const title = prompt("Song Name?");
      if(title) alert("Song Saved (Simulated)"); 
  };

  const renderPiano = () => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", marginTop: "20px" }}>
      {PIANO_KEYS.map((k) => (
          <div key={k.note} onMouseDown={() => playSound(k.note)}
            style={{
              width: k.type === "white" ? "60px" : "40px",
              height: k.type === "white" ? "240px" : "150px",
              background: k.type === "white" 
                ? (activeKey===k.note ? "#38bdf8" : "#e2e8f0") 
                : (activeKey===k.note ? "#38bdf8" : "#1e293b"),
              zIndex: k.type === "white" ? 1 : 2,
              marginLeft: k.type === "black" ? "-20px" : "0",
              marginRight: k.type === "black" ? "-20px" : "4px",
              borderRadius: "0 0 8px 8px",
              cursor: "pointer",
              boxShadow: activeKey===k.note ? "0 0 25px #38bdf8" : "0 4px 6px rgba(0,0,0,0.3)",
              position: "relative",
              transform: activeKey===k.note ? "translateY(4px)" : "none",
              transition: "all 0.1s"
            }}
          >
              <div style={{
                  position: "absolute", bottom: "10px", width: "100%", textAlign: "center", 
                  color: k.type==="white"?"#475569":"#94a3b8", fontWeight: "bold", fontSize: "12px"
              }}>
                  {k.key.toUpperCase()}
              </div>
          </div>
      ))}
    </div>
  );

  const renderGuitar = () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "25px", marginTop: "30px", width: "100%" }}>
      {GUITAR_STRINGS.map((s) => (
        <div key={s.note} onMouseDown={() => playSound(s.note)}
          style={{ 
              width: "100%", height: `${s.thickness}px`, 
              background: activeKey===s.note ? "#fff" : "#94a3b8", 
              cursor: "pointer", 
              boxShadow: activeKey===s.note?"0 0 20px #38bdf8": "none", 
              position: "relative", borderRadius: "2px" 
          }}>
             <span style={{position: "absolute", left: "0", top: "-20px", color: "#38bdf8", fontFamily: "Orbitron", fontSize: "12px"}}>
                 Key: {s.key.toUpperCase()} ({s.note})
             </span>
          </div>
      ))}
    </div>
  );

  const renderDrums = () => (
    <div style={{ display: "flex", gap: "30px", justifyContent: "center", marginTop: "40px", flexWrap: "wrap" }}>
      {DRUM_PADS.map((pad) => (
        <div key={pad.id} onMouseDown={() => playSound(pad.id)}
          style={{ 
              width: "140px", height: "140px", borderRadius: "50%", 
              border: `4px solid ${pad.color}`, 
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", 
              color: "#fff", cursor: "pointer", 
              background: activeKey===pad.id ? pad.color : "radial-gradient(circle, #1e293b, #0f172a)", 
              boxShadow: activeKey===pad.id ? `0 0 40px ${pad.color}` : "0 4px 10px rgba(0,0,0,0.5)",
              transform: activeKey===pad.id ? "scale(0.95)" : "scale(1)", transition: "all 0.1s"
          }}>
          <h3 style={{fontFamily:"Orbitron", margin: 0, fontSize: "1.2rem"}}>{pad.label}</h3>
          <span style={{color: pad.color, fontSize: "0.9rem", marginTop: "5px", fontWeight: "bold"}}>KEY: {pad.key.toUpperCase()}</span>
        </div>
      ))}
    </div>
  );

  const mainColor = airMode === "noble" && instrument === "air" ? "#ffd700" : "#00d4ff"; 

  return (
    <div style={{ minHeight: "100vh", color: "#fff", fontFamily: "'Poppins', sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>
      
      {/* HEADER */}
      <div style={{ textAlign: "center", padding: "30px 0" }}>
        <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "3.5rem", margin: 0, color: mainColor, transition: "color 0.5s" }}>
          VIRTUOSO<span style={{ color: "#fff" }}>HUB</span> <span style={{fontSize: "1.5rem", color: "#facc15"}}>PRO</span>
        </h1>
        <p style={{ letterSpacing: "3px", marginTop: "10px", color: "#94a3b8" }}>PRO STUDIO ENVIRONMENT</p>
      </div>

      {/* INSTRUMENT NAV */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "30px", flexWrap: "wrap" }}>
        {["piano", "guitar", "violin", "flute", "drums", "air"].map((inst) => (
          <button key={inst} onClick={() => { setInstrument(inst); Tone.start(); }}
            style={{
              padding: "12px 30px", border: "none", borderRadius: "30px",
              background: instrument === inst ? mainColor : "rgba(255,255,255,0.05)",
              color: instrument === inst ? "#0f172a" : "#e2e8f0",
              fontFamily: "Orbitron", fontWeight: "bold", fontSize: "1rem",
              cursor: "pointer", boxShadow: instrument === inst ? `0 0 20px ${mainColor}` : "none",
              transition: "all 0.3s ease"
            }}
          >
            {inst.toUpperCase()}
          </button>
        ))}
      </div>

      {/* AIR MODE TOGGLES */}
      {instrument === "air" && (
          <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "20px" }}>
              <button onClick={() => setAirMode("hiphop")} style={{ background: airMode==="hiphop"?"#00d4ff":"transparent", color: airMode==="hiphop"?"#000":"#00d4ff", border: "1px solid #00d4ff", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>🎧 HIP HOP</button>
              <button onClick={() => setAirMode("noble")} style={{ background: airMode==="noble"?"#facc15":"transparent", color: airMode==="noble"?"#000":"#facc15", border: "1px solid #facc15", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>👑 NOBLE MODE</button>
          </div>
      )}

      {/* MAIN STAGE */}
      <div className="glass-panel" style={{ border: `1px solid ${mainColor}` }}>
        <div style={{width: "100%"}}>
            {instrument === "air" && <AirInstrument mode={airMode} />}
            {(instrument === "piano" || instrument === "violin" || instrument === "flute") && renderPiano()}
            {instrument === "guitar" && renderGuitar()}
            {instrument === "drums" && renderDrums()}
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "40px" }}>
        <button onClick={() => { setRecording(true); setStartTime(Date.now()); setEvents([]); }} 
          style={{ background: "#f43f5e", color: "#fff", border: "none", padding: "10px 25px", borderRadius: "10px", cursor: "pointer" }}>
          ● REC
        </button>
        <button onClick={() => setRecording(false)} style={{ background: "#334155", color: "#fff", border: "none", padding: "10px 25px", borderRadius: "10px", cursor: "pointer" }}>
          ■ STOP
        </button>
        <button onClick={replay} style={{ background: "#38bdf8", color: "#000", border: "none", padding: "10px 25px", borderRadius: "10px", cursor: "pointer" }}>
          ▶ PLAY
        </button>
        <button onClick={saveSong} style={{ background: "transparent", border: "1px solid #fff", color: "#fff", padding: "10px 25px", borderRadius: "10px", cursor: "pointer" }}>
          💾 SAVE
        </button>
      </div>

      {/* TRAINING OVERLAY */}
      <div style={{ textAlign: "center", marginTop: "50px", paddingBottom: "50px" }}>
        <h3 style={{ fontFamily: "Orbitron", color: "#94a3b8" }}>TRAINING MODE</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
             {["Twinkle", "Scale", "Beat"].map(s => (
                 <button key={s} onClick={() => startTraining(s.toLowerCase())} 
                 style={{ background: "transparent", border: "1px solid #38bdf8", color: "#38bdf8", padding: "8px 20px", borderRadius: "5px", cursor: "pointer" }}>{s}</button>
             ))}
        </div>
        {trainingActive && <h2 style={{ fontSize: "4rem", color: "#fff", textShadow: "0 0 20px #38bdf8" }}>{nextNote}</h2>}
        <h2 style={{ color: feedback.includes("Perfect") ? "#4ade80" : "#facc15" }}>Score: {score}</h2>
      </div>
    </div>
  );
}

export default App;