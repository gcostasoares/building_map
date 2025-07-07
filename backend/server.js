// server.js
require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const Building = require('./models/Building');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});


app.use(cors({
  origin: 'http://127.0.0.1:5500'
}));
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));


app.get('/', (_req, res) => {
  res.send('🏠 Building API is up!');
});

app.get('/api/buildings', async (_req, res) => {
  try {
    const all = await Building.find();
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/buildings/:id', async (req, res) => {
  try {
    const b = await Building.findById(req.params.id);
    if (!b) return res.status(404).send('Not found');
    res.json(b);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// (Optional) POST to create a building
app.post('/api/buildings', async (req, res) => {
  try {
    const newB = await Building.create(req.body);
    res.status(201).json(newB);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/buildings/:id', async (req, res) => {
  try {
    const updated = await Building.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).send('Not found');
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/buildings/:id', async (req, res) => {
  try {
    const del = await Building.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).send('Not found');
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`🚀 Server listening on http://localhost:${port}`));
