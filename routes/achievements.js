const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Achievement = require('../models/Achievement');
const { requireAdmin } = require('../middleware/auth');
const { createUploader, safeUnlinkUpload } = require('../middleware/fileHelper');

const upload = createUploader('achievement');

router.get('/', async (req, res) => {
  try {
    const achievements = await Achievement.find().sort({ createdAt: -1 });
    res.json(achievements);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch achievements' }); }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid achievement ID' });
    }
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });
    res.json(achievement);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch achievement' }); }
});

router.post('/', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const { title, description, category, date } = req.body;
    if (!title || !description) {
      if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
      return res.status(400).json({ error: 'Title and description are required' });
    }
    const photo = req.file ? '/uploads/' + req.file.filename : null;
    const achievement = new Achievement({
      title: String(title).trim(),
      description: String(description).trim(),
      category: category ? String(category).trim() : '',
      date: date ? String(date).trim() : '',
      photo
    });
    await achievement.save();
    res.status(201).json(achievement);
  } catch (e) {
    if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
    res.status(500).json({ error: 'Failed to save achievement' });
  }
});

router.put('/:id', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
      return res.status(400).json({ error: 'Invalid achievement ID' });
    }
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) {
      if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
      return res.status(404).json({ error: 'Achievement not found' });
    }
    if (req.file) {
      if (achievement.photo) safeUnlinkUpload(achievement.photo);
      achievement.photo = '/uploads/' + req.file.filename;
    }
    const { title, description, category, date } = req.body;
    if (title) achievement.title = String(title).trim();
    if (description) achievement.description = String(description).trim();
    if (category) achievement.category = String(category).trim();
    if (date !== undefined) achievement.date = String(date).trim();
    await achievement.save();
    res.json(achievement);
  } catch (e) {
    if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
    res.status(500).json({ error: 'Failed to update achievement' });
  }
});

router.delete('/all', requireAdmin, async (req, res) => {
  try {
    const achievements = await Achievement.find({});
    for (const a of achievements) {
      if (a.photo) safeUnlinkUpload(a.photo);
    }
    await Achievement.deleteMany({});
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to clear achievements' }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid achievement ID' });
    }
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });
    if (achievement.photo) safeUnlinkUpload(achievement.photo);
    await Achievement.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to delete achievement' }); }
});

module.exports = router;
