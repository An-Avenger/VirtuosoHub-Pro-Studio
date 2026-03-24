import React from 'react';

const TABS = [
  { id: 'piano',     label: '🎹 PIANO' },
  { id: 'guitar',    label: '🎸 GUITAR' },
  { id: 'drums',     label: '🥁 DRUMS' },
  { id: 'sequencer', label: '🎛 SEQUENCER' },
  { id: 'air',       label: '🤖 AIR' },
  { id: 'trainer',   label: '🎓 TRAINER' },
];

export default function NavBar({ activeTab, setActiveTab, isRecording, airMode }) {
  return (
    <nav className="navbar">
      {TABS.map((tab) => {
        const isAir = tab.id === 'air' && activeTab === 'air';
        const isNoble = isAir && airMode === 'noble';
        return (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? (isNoble ? 'noble-active' : 'active') : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.id === 'sequencer' && isRecording && (
              <span className="rec-led" />
            )}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
