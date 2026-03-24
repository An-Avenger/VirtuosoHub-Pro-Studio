import React, { useRef, useState, useCallback } from 'react';
import { initAudio } from '../audio/AudioEngine.js';

export default function StudioControls({ events, onSaveSuccess }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordedBlobRef = useRef(null);
  const audioElemRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [savedSongs, setSavedSongs] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');

  // Load saved songs on mount
  React.useEffect(() => {
    fetch('http://localhost:5000/songs')
      .then(r => r.json())
      .then(data => setSavedSongs(data))
      .catch(() => {}); // server may not be running
  }, []);

  const startRecording = useCallback(async () => {
    await initAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        recordedBlobRef.current = blob;
        if (audioElemRef.current) {
          audioElemRef.current.src = URL.createObjectURL(blob);
        }
        setHasRecording(true);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access denied:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const playRecording = useCallback(() => {
    audioElemRef.current?.play();
  }, []);

  const saveRecording = useCallback(async () => {
    const title = window.prompt('Name your session:');
    if (!title) return;

    // Download the .webm file
    if (recordedBlobRef.current) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(recordedBlobRef.current);
      a.download = `${title}.webm`;
      a.click();
    }

    // Also persist event sequence to backend
    try {
      const body = { title, instrument: 'studio', events: events || [] };
      const res = await fetch('http://localhost:5000/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaveStatus('✅ Saved!');
        // Refresh list
        const updated = await fetch('http://localhost:5000/songs').then(r => r.json());
        setSavedSongs(updated);
        onSaveSuccess?.();
      } else {
        setSaveStatus('Server error — file downloaded locally');
      }
    } catch {
      setSaveStatus('Backend offline — file downloaded locally');
    }
    setTimeout(() => setSaveStatus(''), 3000);
  }, [events, onSaveSuccess]);

  return (
    <div>
      <div className="studio-controls">
        <button
          className={`ctrl-btn rec ${isRecording ? 'active' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? <><span className="rec-led" /> REC…</> : '⏺ REC'}
        </button>
        <button className="ctrl-btn stop" onClick={stopRecording}>■ STOP</button>
        <button className="ctrl-btn play" onClick={playRecording} disabled={!hasRecording}>▶ PLAY</button>
        <button className="ctrl-btn save" onClick={saveRecording} disabled={!hasRecording}>💾 SAVE</button>
        {saveStatus && <span style={{ fontSize: '0.8rem', color: 'var(--cyan)' }}>{saveStatus}</span>}
        <audio ref={audioElemRef} style={{ display: 'none' }} />
      </div>
      {savedSongs.length > 0 && (
        <div className="saved-songs-list">
          {savedSongs.slice(0, 8).map(s => (
            <span key={s._id} className="saved-song-chip" title={new Date(s.createdAt).toLocaleDateString()}>
              🎵 {s.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
