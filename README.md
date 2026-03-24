# 🎵 VirtuosoHub - AI-Powered Web DAW

> **M.Tech Project | CSE | 2026**
> **Developed by: Aryan Sharma**

VirtuosoHub is a full-stack Digital Audio Workstation (DAW) that runs entirely in the browser. It combines **professional-grade audio synthesis** with **Computer Vision (AI)** to create a touchless musical interface. It also features a gamified training engine to teach music theory with real-time accuracy scoring.

---

## 🚀 Key Features

### 🎹 1. Multi-Instrument Synthesis (Physical Modelling)
Unlike simple "playback" apps, VirtuosoHub uses **Tone.js** to synthesize audio in real-time using physical modelling algorithms:
* **Piano:** Polyphonic synthesis with envelope shaping.
* **Guitar:** Physical string simulation (Karplus-Strong algorithm).
* **Violin:** Sawtooth wave generation with bow-attack emulation.
* **Drums:** Membrane synthesis for kick/toms and noise synthesis for snares.

### 🔮 2. "Air Virtuoso" Mode (Computer Vision)
A touchless **Theremin interface** powered by **Handtrack.js (TensorFlow)**.
* Uses the webcam to track hand coordinates in real-time.
* Maps **X-Axis** to Frequency (Pitch).
* Maps **Hand Presence** to Note Triggering (Attack/Release).
* *Innovations:* Includes an intelligent filter to distinguish hands from faces.

### 🎓 3. Gamified Training Mode
An interactive learning module with real-time feedback.
* **Algorithm:** Compares user input timestamps against a golden dataset.
* **Scoring:** Calculates latency (±300ms accuracy window) to award points.
* **Visual Prompts:** Highlights keys/drums in real-time to guide the user.

### 💾 4. Cloud Persistence (MERN Stack)
* **Record:** Captures MIDI-like events (Note, Time, Duration).
* **Save/Load:** Stores compositions in a **MongoDB** database via a **Node/Express** REST API.

---

## 🛠️ Tech Stack

| Component | Technology | Usage |
| :--- | :--- | :--- |
| **Frontend** | React.js | UI Components & State Management |
| **Audio Engine** | Tone.js | Real-time Audio Synthesis & Timing |
| **AI / ML** | Handtrack.js | Computer Vision & Hand Detection |
| **Backend** | Node.js + Express | REST API & Server Logic |
| **Database** | MongoDB | Storing User Recordings & Song Metadata |

---

## 📦 Installation & Setup

### Prerequisites
* Node.js (v14 or higher)
* MongoDB (Local or Atlas URL)

### Step 1: Backend Setup
```bash
cd server
npm install
# Start the Server (Default Port: 5000)
node server.js