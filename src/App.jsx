import React, { useState, useCallback } from 'react';
import * as Tone from 'tone';
import NavBar from './components/NavBar.jsx';
import StudioControls from './components/StudioControls.jsx';
import Piano from './components/Piano.jsx';
import Guitar from './components/Guitar.jsx';
import Drums from './components/Drums.jsx';
import Sequencer from './components/Sequencer.jsx';
import AirInstrument from './components/AirInstrument.jsx';
import TrainingMode from './components/TrainingMode.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('piano');
  const [airMode, setAirMode]     = useState('hiphop');
  const [events, setEvents]       = useState([]);
  const [startTime]               = useState(() => Date.now());

  // Resume AudioContext on first user interaction (browser requirement)
  const handleRootClick = useCallback(async () => {
    if (Tone.context.state !== 'running') {
      try { await Tone.start(); } catch {}
    }
  }, []);

  // Record note events from any instrument
  const onNote = useCallback((note) => {
    setEvents(prev => [...prev, { note, time: Date.now() - startTime, instrument: activeTab }]);
  }, [activeTab, startTime]);

  const renderInstrument = () => {
    switch (activeTab) {
      case 'piano':     return <Piano onNote={onNote} />;
      case 'guitar':    return <Guitar onNote={onNote} />;
      case 'drums':     return <Drums onNote={onNote} />;
      case 'sequencer': return <Sequencer />;
      case 'air':       return <AirInstrument mode={airMode} setMode={setAirMode} />;
      case 'trainer':   return <TrainingMode />;
      default:          return null;
    }
  };

  return (
    <div className="app-wrapper" onClick={handleRootClick}>
      {/* HEADER */}
      <header className="app-header">
        <h1>
          VIRTUOSO<span className="hub">HUB</span>{' '}
          <span className="pro">PRO</span>
        </h1>
        <p>PRO STUDIO ENVIRONMENT</p>
      </header>

      {/* NAV */}
      <NavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        airMode={airMode}
      />

      {/* STUDIO CONTROLS (always visible) */}
      <StudioControls events={events} />

      {/* MAIN INSTRUMENT PANEL */}
      <main className="glass-panel" style={{
        borderColor: activeTab === 'air' && airMode === 'noble'
          ? 'rgba(255,215,0,0.25)'
          : 'rgba(0,212,255,0.15)',
      }}>
        {renderInstrument()}
      </main>

      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', fontSize: '0.75rem', fontFamily: 'var(--font-display)' }}>
        VIRTUOSOHUB PRO · BROWSER DAW · ZERO INSTALL
      </footer>
    </div>
  );
}
