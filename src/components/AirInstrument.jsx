import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { hiphopSynth, nobleSynth, SCALE_HIPHOP, SCALE_NOBLE, initAudio } from '../audio/AudioEngine.js';

/* ─────────────────────────────────────────────────────────────────────────────
   Dynamic script loader — injects a <script> tag and resolves when it's done.
   If the script was already injected, resolves immediately.
───────────────────────────────────────────────────────────────────────────── */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(); return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.crossOrigin = 'anonymous';
    s.onload  = resolve;
    s.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });
}

/* CDN base — pinned versions that are known-good */
const MP_HANDS_CDN    = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915';
const MP_FACE_CDN     = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619';
const MP_CAMERA_CDN   = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862';

async function loadMediaPipe(setStatus) {
  setStatus('Loading scripts… (first time ~15s)');
  await loadScript(`${MP_HANDS_CDN}/hands.js`);
  await loadScript(`${MP_FACE_CDN}/face_mesh.js`);
  await loadScript(`${MP_CAMERA_CDN}/camera_utils.js`);
  // Give the scripts a tick to register their globals
  await new Promise(r => setTimeout(r, 200));
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────────────── */
export default function AirInstrument({ mode, setMode }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef  = useRef(null);
  const faceRef   = useRef(null);
  const isMounted = useRef(true);
  const isPlaying = useRef(false);
  const lastChord = useRef(0);
  const modeRef   = useRef(mode);   // always-current, avoids stale closures

  useEffect(() => { modeRef.current = mode; }, [mode]);

  const [status,   setStatus]   = useState('Click "Enable Webcam" to start');
  const [detected, setDetected] = useState('');
  const [webcamOn, setWebcamOn] = useState(false);
  const [loading,  setLoading]  = useState(false);

  /* ── CLEANUP ─────────────────────────────────────────────────────────────*/
  const silence = useCallback(() => {
    try { hiphopSynth.triggerRelease(); } catch {}
    try { nobleSynth.releaseAll(); }    catch {}
    isPlaying.current = false;
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      try { cameraRef.current?.stop(); } catch {}
      silence();
    };
  }, [silence]);

  useEffect(() => {
    if (webcamOn) { silence(); setDetected(''); }
  }, [mode, webcamOn, silence]);

  /* ── AUDIO ───────────────────────────────────────────────────────────────*/
  /* NOTE: reading modeRef + isPlaying ref directly — no closure over state */
  const updateSound = (nx, ny) => {
    initAudio().catch(() => {});
    const gain  = Math.max(0.001, Math.min(1, 1 - ny));
    const volDb = Tone.gainToDb(gain);

    if (modeRef.current === 'hiphop') {
      const idx  = Math.max(0, Math.min(Math.floor(nx * SCALE_HIPHOP.length), SCALE_HIPHOP.length - 1));
      const note = SCALE_HIPHOP[idx];
      const freq = Tone.Frequency(note).toFrequency();
      try {
        if (!isPlaying.current) { hiphopSynth.triggerAttack(note); isPlaying.current = true; }
        hiphopSynth.frequency?.rampTo(freq, 0.05);
        hiphopSynth.volume?.rampTo(volDb, 0.08);
      } catch {}
    } else {
      const idx   = Math.max(0, Math.min(Math.floor(nx * SCALE_NOBLE.length), SCALE_NOBLE.length - 1));
      const chord = SCALE_NOBLE[idx];
      const now   = Date.now();
      try {
        nobleSynth.volume?.rampTo(volDb, 0.1);
        if (now - lastChord.current > 380) {
          if (isPlaying.current) nobleSynth.releaseAll();
          nobleSynth.triggerAttack(chord);
          isPlaying.current = true;
          lastChord.current = now;
        }
      } catch {}
    }
  };

  /* ── CANVAS HELPERS ──────────────────────────────────────────────────────*/
  const prepCanvas = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return null;
    const W = v.videoWidth || 640, H = v.videoHeight || 480;
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    return { ctx, W, H };
  };

  const drawHand = (ctx, lms, W, H) => {
    const BONES = [
      [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
      [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
      [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17],
    ];
    const px = lm => ({ x: (1 - lm.x) * W, y: lm.y * H });
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2.5;
    BONES.forEach(([a, b]) => {
      const pa = px(lms[a]), pb = px(lms[b]);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    });
    lms.forEach(lm => {
      const { x, y } = px(lm);
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#00d4ff'; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8;
      ctx.fill(); ctx.shadowBlur = 0;
    });
  };

  const drawFace = (ctx, lms, W, H) => {
    const OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10];
    const LEYE = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246,33];
    const REYE = [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398,362];
    const LIPS = [61,146,91,181,84,17,314,405,321,375,291,61];
    const px = i => ({ x: (1 - lms[i].x) * W, y: lms[i].y * H });
    const poly = (idxs, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath();
      idxs.forEach((i, n) => { const p = px(i); n === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    };
    poly(OVAL,'rgba(255,215,0,0.7)'); poly(LEYE,'rgba(255,215,0,0.55)');
    poly(REYE,'rgba(255,215,0,0.55)'); poly(LIPS,'rgba(255,215,0,0.7)');
    const n = px(1);
    ctx.beginPath(); ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 20;
    ctx.fill(); ctx.shadowBlur = 0;
  };

  /* ── onResults CALLBACKS (read modeRef, not closed-over mode) ────────────*/
  const onHandResults = (results) => {
    if (!isMounted.current || modeRef.current !== 'hiphop') return;
    const r = prepCanvas(); if (!r) return;
    if (results.multiHandLandmarks?.length > 0) {
      const lms = results.multiHandLandmarks[0];
      drawHand(r.ctx, lms, r.W, r.H);
      const palm = [0,5,9,13,17].reduce((a, i) => ({ x: a.x + lms[i].x/5, y: a.y + lms[i].y/5 }), {x:0,y:0});
      if (isMounted.current) setDetected('✋ HAND TRACKED');
      updateSound(palm.x, palm.y);
    } else {
      if (isMounted.current) setDetected('👀 searching for hand…');
      silence();
    }
  };

  const onFaceResults = (results) => {
    if (!isMounted.current || modeRef.current !== 'noble') return;
    const r = prepCanvas(); if (!r) return;
    if (results.multiFaceLandmarks?.length > 0) {
      const lms = results.multiFaceLandmarks[0];
      drawFace(r.ctx, lms, r.W, r.H);
      if (isMounted.current) setDetected('😊 FACE TRACKED');
      updateSound(lms[1].x, lms[1].y);
    } else {
      if (isMounted.current) setDetected('👀 searching for face…');
      silence();
    }
  };

  /* ── ENABLE WEBCAM ───────────────────────────────────────────────────────*/
  const enableWebcam = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    // 1. Load MediaPipe CDN scripts (waits for full load)
    try {
      await loadMediaPipe(setStatus);
    } catch (err) {
      setStatus(`❌ Scripts failed to load: ${err.message}`); setLoading(false); return;
    }

    const HandsClass    = window.Hands;
    const FaceMeshClass = window.FaceMesh;
    const CameraClass   = window.Camera;

    if (!HandsClass || !FaceMeshClass || !CameraClass) {
      setStatus('❌ MediaPipe globals missing after load — check network'); setLoading(false); return;
    }

    // 2. Request camera
    setStatus('Requesting camera access…');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width:1280, height:720, facingMode:'user' }, audio:false });
    } catch (err) {
      setStatus(`❌ Camera denied: ${err.message}`); setLoading(false); return;
    }
    const video = videoRef.current;
    video.srcObject = stream;
    await video.play();

    setStatus('Initialising AI models…');

    // 3. MediaPipe Hands
    const hands = new HandsClass({
      locateFile: f => `${MP_HANDS_CDN}/${f}`,
    });
    hands.setOptions({ maxNumHands:1, modelComplexity:1, minDetectionConfidence:0.6, minTrackingConfidence:0.5 });
    hands.onResults(onHandResults);
    handsRef.current = hands;

    // 4. MediaPipe FaceMesh
    const face = new FaceMeshClass({
      locateFile: f => `${MP_FACE_CDN}/${f}`,
    });
    face.setOptions({ maxNumFaces:1, refineLandmarks:false, minDetectionConfidence:0.55, minTrackingConfidence:0.5 });
    face.onResults(onFaceResults);
    faceRef.current = face;

    // 5. Camera utility drives the frame loop at 30fps
    const cam = new CameraClass(video, {
      onFrame: async () => {
        if (!isMounted.current) return;
        try {
          if (modeRef.current === 'hiphop') await handsRef.current?.send({ image: video });
          else                              await faceRef.current?.send({ image: video });
        } catch { /* ignore transient frame errors */ }
      },
      width: 1280,
      height: 720,
    });
    await cam.start();
    cameraRef.current = cam;

    setWebcamOn(true);
    setLoading(false);
    setStatus(modeRef.current === 'noble' ? '👑 NOBLE MODE READY' : '🎧 HIP HOP MODE READY');
    setDetected('');
  }, [loading, silence]); // eslint-disable-line

  // Status label update when mode changes
  useEffect(() => {
    if (webcamOn) setStatus(mode === 'noble' ? '👑 NOBLE MODE READY' : '🎧 HIP HOP MODE READY');
  }, [mode, webcamOn]);

  const themeColor = mode === 'noble' ? 'var(--gold)' : 'var(--cyan)';

  return (
    <div className="air-wrap">
      {/* Mode toggle */}
      <div className="air-mode-btns">
        <button className={`air-mode-btn hiphop ${mode==='hiphop'?'active':''}`} onClick={() => setMode('hiphop')}>
          🎧 HIP HOP
        </button>
        <button className={`air-mode-btn noble ${mode==='noble'?'active':''}`} onClick={() => setMode('noble')}>
          👑 NOBLE
        </button>
      </div>

      {/* Status */}
      <div className="air-status" style={{ color: themeColor }}>
        {loading && <span style={{ marginRight: 8 }}>⏳</span>}
        {status}
        {detected && <span style={{ color:'#fff', marginLeft:12, fontSize:'0.75rem' }}>| {detected}</span>}
      </div>

      {/* Enable button */}
      {!webcamOn && (
        <button
          disabled={loading}
          style={{ padding:'14px 40px', background: loading ? '#334155' : themeColor,
                   color: loading ? '#64748b' : 'var(--bg)', border:'none', borderRadius:8,
                   fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.9rem',
                   cursor: loading ? 'wait' : 'pointer', marginBottom:20,
                   boxShadow: loading ? 'none' : `0 0 30px ${themeColor}55` }}
          onClick={enableWebcam}
        >
          {loading ? 'LOADING…' : 'ENABLE WEBCAM'}
        </button>
      )}

      {/* Video + Canvas */}
      <div
        className={`air-video-container ${mode==='noble'?'noble-mode':''}`}
        style={{ display: webcamOn ? 'block' : 'none',
                 borderColor: themeColor, boxShadow: `0 0 60px ${themeColor}33` }}
      >
        <video ref={videoRef} className="air-video" playsInline muted />
        <canvas ref={canvasRef} className="air-canvas" />
        <div className="air-overlay-text" style={{ color: themeColor }}>
          {mode === 'noble'
            ? '✨ TURN HEAD LEFT/RIGHT = CHORDS · UP/DOWN = VOLUME ✨'
            : '⚡ MOVE HAND: LEFT/RIGHT = PITCH · UP/DOWN = VOLUME ⚡'}
        </div>
      </div>
    </div>
  );
}
