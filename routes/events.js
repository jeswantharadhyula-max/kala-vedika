const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Event = require('../models/Event');
const { requireAdmin } = require('../middleware/auth');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => cb(null, 'event_' + Date.now() + path.extname(file.originalname))
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
    const events = await Event.find().sort({ event_date: 1 });
    res.json(events);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const { title, description, event_date, event_time, venue, category, status } = req.body;
    if (!title || !description || !event_date) return res.status(400).json({ error: 'Title, description, and event_date are required' });
    const photo = req.file ? '/uploads/' + req.file.filename : null;
    const VALID_STATUSES = ['upcoming', 'completed'];
    const safeStatus = VALID_STATUSES.includes(status) ? status : 'upcoming';
    const event = new Event({ title, description, event_date, event_time: event_time || '', venue: venue || '', category: category || '', status: safeStatus, photo });
    await event.save();
    res.status(201).json(event);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (req.file) {
      if (event.photo) { const old = path.join(__dirname, '../public', event.photo); if (fs.existsSync(old)) fs.unlinkSync(old); }
      event.photo = '/uploads/' + req.file.filename;
    }
    const { title, description, event_date, event_time, venue, category, status } = req.body;
    if (title) event.title = title;
    if (description) event.description = description;
    if (event_date) event.event_date = event_date;
    if (event_time !== undefined) event.event_time = event_time;
    if (venue !== undefined) event.venue = venue;
    if (category) event.category = category;
    if (status) event.status = status;
    await event.save();
    res.json(event);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.photo) { const old = path.join(__dirname, '../public', event.photo); if (fs.existsSync(old)) fs.unlinkSync(old); }
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
