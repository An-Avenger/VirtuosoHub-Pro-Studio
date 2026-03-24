const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
}));
app.use(express.json());

// ─── DATABASE ─────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/virtuosohub';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
const SongSchema = new mongoose.Schema({
  title:      { type: String, required: true, maxlength: 100 },
  instrument: { type: String, default: 'unknown' },
  events:     { type: Array, default: [] },
  createdAt:  { type: Date, default: Date.now },
});

const Song = mongoose.model('Song', SongSchema);

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Save a song
app.post('/save', async (req, res) => {
  const { title, instrument, events } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'title is required' });
  }
  try {
    const song = new Song({ title: title.trim(), instrument, events: events || [] });
    await song.save();
    console.log('🎵 Saved:', song.title);
    res.status(201).json({ message: 'Song saved!', id: song._id });
  } catch (err) {
    res.status(500).json({ error: 'Could not save song' });
  }
});

// Get all songs
app.get('/songs', async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 }).limit(50);
    res.json(songs);
  } catch {
    res.status(500).json({ error: 'Could not fetch songs' });
  }
});

// Delete a song
app.delete('/songs/:id', async (req, res) => {
  try {
    await Song.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ error: 'Could not delete' });
  }
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));