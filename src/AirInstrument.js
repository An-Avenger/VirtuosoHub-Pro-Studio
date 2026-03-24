import React, { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import * as handTrack from "handtrackjs";

const AirInstrument = ({ mode }) => {
  const videoRef = useRef(null);
  const modelRef = useRef(null);
  const synthRef = useRef(null);
  const reverbRef = useRef(null);
  const requestRef = useRef(null);
  
  // SAFETY FLAGS
  const isMounted = useRef(true);
  const isPlaying = useRef(false);

  const [status, setStatus] = useState("Initializing AI...");
  const [detected, setDetected] = useState("WAITING FOR CAMERA...");

  const scaleHipHop = ["C4", "Eb4", "F4", "G4", "Bb4", "C5", "Eb5", "F5"];
  const scaleNoble = ["C3", "E3", "G3", "A3", "C4", "D4", "E4", "G4"];
  
  const noteToFreq = (note) => Tone.Frequency(note).toFrequency();

  useEffect(() => {
    isMounted.current = true;
    setupAudio();

    const startVideo = async () => {
      setStatus("Requesting Camera...");
      try {
          const status = await handTrack.startVideo(videoRef.current);
          if (status && isMounted.current) {
            setStatus("Loading AI Model...");
            loadModel();
          } else {
            setStatus("Camera Failed. Please Allow Permissions.");
          }
      } catch (err) {
          console.error("Camera Start Error:", err);
          setStatus("Camera Error. Refresh Page.");
      }
    };

    const loadModel = async () => {
      try {
          const model = await handTrack.load({
            flipHorizontal: true,
            maxNumBoxes: 2, 
            iouThreshold: 0.5,
            scoreThreshold: 0.6,
          });
          
          if (isMounted.current) {
            modelRef.current = model;
            setStatus(mode === "noble" ? "👑 NOBLE MODE READY" : "🎧 HIP HOP MODE READY");
            detect();
          }
      } catch (err) {
          console.error("Model Load Error:", err);
          setStatus("AI Failed to Load");
      }
    };

    startVideo();

    return () => {
      isMounted.current = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      cleanupAudio();
      if (videoRef.current && videoRef.current.srcObject) {
         const tracks = videoRef.current.srcObject.getTracks();
         tracks.forEach(t => t.stop());
      }
    };
  }, [mode]);

  const setupAudio = async () => {
    cleanupAudio();
    if (!isMounted.current) return;

    try {
        if (mode === "noble") {
            reverbRef.current = new Tone.Reverb({ decay: 6, wet: 0.6 }).toDestination();
            await reverbRef.current.generate();
            
            if (!isMounted.current) return;

            synthRef.current = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "fatsawtooth", count: 3, spread: 30 },
                envelope: { attack: 0.8, decay: 0.5, sustain: 1, release: 2 }
            }).connect(reverbRef.current);
            
        } else {
            synthRef.current = new Tone.MonoSynth({
                oscillator: { type: "sawtooth" },
                envelope: { attack: 0.1, decay: 0.3, sustain: 1, release: 0.8 },
                filterEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 3, exponent: 2 },
                portamento: 0.15 
            }).toDestination();
        }
    } catch (e) {
        console.warn("Audio Setup Issue:", e);
    }
  };

  const cleanupAudio = () => {
    if (synthRef.current) { try { synthRef.current.dispose(); } catch(e){} synthRef.current = null; }
    if (reverbRef.current) { try { reverbRef.current.dispose(); } catch(e){} reverbRef.current = null; }
  };

  const detect = async () => {
    if (!isMounted.current) return;

    // --- 🚨 CRITICAL CRASH FIX 🚨 ---
    // If video is not ready (readyState 4 means HAVE_ENOUGH_DATA), WAIT.
    if (!videoRef.current || videoRef.current.readyState !== 4 || !modelRef.current) {
        requestRef.current = requestAnimationFrame(detect);
        return;
    }

    try {
        const predictions = await modelRef.current.detect(videoRef.current);

        if (predictions.length > 0) {
          const width = videoRef.current.videoWidth;
          const height = videoRef.current.videoHeight;
          let target = null;

          if (mode === "noble") {
              target = predictions.find(p => p.label === 'face') || predictions[0];
              setDetected(target ? "FACE TRACKING" : "...");
          } else {
              target = predictions.find(p => p.label !== 'face') || predictions[0];
              setDetected(target ? "HAND TRACKING" : "...");
          }

          if (target && width > 0) {
              const [x, y, w, h] = target.bbox;
              const normalizedX = (x + w/2) / width;
              const normalizedY = (y + h/2) / height;
              updateSound(normalizedX, normalizedY);
          }
        } else {
            setDetected("SEARCHING...");
            if (synthRef.current && isPlaying.current) {
                 if (mode === "hiphop") synthRef.current.triggerRelease();
                 if (mode === "noble") synthRef.current.releaseAll();
                 isPlaying.current = false;
            }
        }
    } catch (err) {
        // Ignore detection errors to keep app running
    }
    
    requestRef.current = requestAnimationFrame(detect);
  };

  const updateSound = async (x, y) => {
    if (!synthRef.current) return;
    
    if (Tone.context.state !== "running") {
        try { await Tone.start(); } catch(e){}
    }

    const currentScale = mode === "noble" ? scaleNoble : scaleHipHop;
    const index = Math.floor(x * currentScale.length);
    const safeIndex = Math.max(0, Math.min(index, currentScale.length - 1));
    const targetNote = currentScale[safeIndex];
    const freq = noteToFreq(targetNote);
    const volumeGain = Math.max(0, Math.min(1, 1 - y)); 
    const volDb = Tone.gainToDb(volumeGain);

    try {
        if (mode === "noble") {
            if (synthRef.current.volume) synthRef.current.volume.rampTo(volDb, 0.1);
            if (!isPlaying.current && volumeGain > 0.05) {
                synthRef.current.triggerAttack([targetNote, Tone.Frequency(targetNote).transpose(7).toNote()]);
                isPlaying.current = true;
            }
        } else {
            if (synthRef.current.frequency) synthRef.current.frequency.rampTo(freq, 0.1); 
            if (synthRef.current.volume) synthRef.current.volume.rampTo(volDb, 0.1);
            if (!isPlaying.current && volumeGain > 0.05) {
                synthRef.current.triggerAttack(freq);
                isPlaying.current = true;
            }
        }
    } catch (err) {}
  };

  const themeColor = mode === "noble" ? "#ffd700" : "#00d4ff"; 

  return (
    <div style={{ textAlign: "center", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h3 style={{ fontFamily: "'Orbitron', sans-serif", color: themeColor, marginBottom: "15px", textShadow: `0 0 15px ${themeColor}`, letterSpacing: "2px" }}>
        {status} <span style={{fontSize: "0.8em", color: "#fff"}}>| {detected}</span>
      </h3>
      
      <div style={{ 
          position: "relative",
          padding: "5px",
          background: mode === "noble" ? "rgba(40, 30, 0, 0.5)" : "rgba(0, 20, 30, 0.5)",
          border: `2px solid ${themeColor}`,
          borderRadius: "20px",
          boxShadow: `0 0 50px ${mode === "noble" ? "rgba(255, 215, 0, 0.2)" : "rgba(0, 212, 255, 0.2)"}`,
          width: "95%",  // WIDER
          maxWidth: "1200px", // MAX WIDTH INCREASED
          aspectRatio: "16/9", // CINEMATIC RATIO
          overflow: "hidden"
      }}>
        <video
          ref={videoRef}
          width="640" 
          height="480"
          style={{ 
            display: "block",
            width: "100%",    
            height: "100%",   
            borderRadius: "15px",
            objectFit: "cover", // FILLS THE BOX
            transform: "scaleX(-1)", // MIRROR EFFECT for natural feel
            filter: mode === "noble" ? "contrast(1.2) sepia(0.4)" : "contrast(1.2) hue-rotate(180deg)" 
          }}
        />
        
        <div style={{
            position: "absolute", top: "0", left: "0", right: "0", bottom: "0",
            pointerEvents: "none",
            border: "1px solid rgba(255,255,255,0.05)",
            background: mode === "noble" 
                ? "linear-gradient(180deg, rgba(255,215,0,0.1) 0%, transparent 50%, rgba(255,215,0,0.1) 100%)"
                : "linear-gradient(90deg, transparent 0%, transparent 49%, rgba(0,212,255,0.3) 50%, transparent 51%)"
        }}>
            <div style={{ position: "absolute", bottom: "20px", width: "100%", textAlign: "center", color: "rgba(255,255,255,0.9)", fontSize: "1.2rem", fontWeight: "bold", fontFamily: "Orbitron", textShadow: "0 0 10px #000" }}>
                {mode === "noble" ? "✨ TILT HEAD TO PLAY ORCHESTRA ✨" : "⚡️ MOVE HAND TO PLAY SYNTH ⚡️"}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AirInstrument;