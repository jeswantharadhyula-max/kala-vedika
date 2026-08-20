const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Achievement = require('../models/Achievement');
const { requireAdmin } = require('../middleware/auth');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => cb(null, 'achievement_' + Date.now() + path.extname(file.originalname))
});
const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'), false);
  }
};
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

router.get('/', async (req, res) => {
  try {
    const achievements = await Achievement.find().sort({ createdAt: -1 });
    res.json(achievements);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const { title, description, category, date } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });
    const photo = req.file ? '/uploads/' + req.file.filename : null;
    const achievement = new Achievement({ title, description, category: category || '', date: date || '', photo });
    await achievement.save();
    res.status(201).json(achievement);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });
    if (req.file) {
      if (achievement.photo) { const old = path.join(__dirname, '../public', achievement.photo); if (fs.existsSync(old)) fs.unlinkSync(old); }
      achievement.photo = '/uploads/' + req.file.filename;
    }
    const { title, description, category, date } = req.body;
    if (title) achievement.title = title;
    if (description) achievement.description = description;
    if (category) achievement.category = category;
    if (date !== undefined) achievement.date = date;
    await achievement.save();
    res.json(achievement);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });
    if (achievement.photo) { const old = path.join(__dirname, '../public', achievement.photo); if (fs.existsSync(old)) fs.unlinkSync(old); }
    await Achievement.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
