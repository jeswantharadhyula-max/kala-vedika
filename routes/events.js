const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Event = require('../models/Event');
const { requireAdmin } = require('../middleware/auth');
const { createUploader, safeUnlinkUpload } = require('../middleware/fileHelper');

const upload = createUploader('event');

router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ event_date: 1 });
    res.json(events);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch events' }); }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch event' }); }
});

router.post('/', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const { title, description, event_date, event_time, venue, category, status } = req.body;
    if (!title || !description || !event_date) {
      if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
      return res.status(400).json({ error: 'Title, description, and event_date are required' });
    }
    const photo = req.file ? '/uploads/' + req.file.filename : null;
    const VALID_STATUSES = ['upcoming', 'completed'];
    const safeStatus = VALID_STATUSES.includes(status) ? status : 'upcoming';
    const event = new Event({
      title: String(title).trim(),
      description: String(description).trim(),
      event_date: String(event_date).trim(),
      event_time: event_time ? String(event_time).trim() : '',
      venue: venue ? String(venue).trim() : '',
      category: category ? String(category).trim() : '',
      status: safeStatus,
      photo
    });
    await event.save();
    res.status(201).json(event);
  } catch (e) {
    if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
    res.status(500).json({ error: 'Failed to save event' });
  }
});

router.put('/:id', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    const event = await Event.findById(req.params.id);
    if (!event) {
      if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
      return res.status(404).json({ error: 'Event not found' });
    }
    if (req.file) {
      if (event.photo) safeUnlinkUpload(event.photo);
      event.photo = '/uploads/' + req.file.filename;
    }
    const { title, description, event_date, event_time, venue, category, status } = req.body;
    if (title) event.title = String(title).trim();
    if (description) event.description = String(description).trim();
    if (event_date) event.event_date = String(event_date).trim();
    if (event_time !== undefined) event.event_time = String(event_time).trim();
    if (venue !== undefined) event.venue = String(venue).trim();
    if (category) event.category = String(category).trim();
    if (status) {
      const VALID_STATUSES = ['upcoming', 'completed'];
      if (VALID_STATUSES.includes(status)) event.status = status;
    }
    await event.save();
    res.json(event);
  } catch (e) {
    if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/all', requireAdmin, async (req, res) => {
  try {
    const events = await Event.find({});
    for (const ev of events) {
      if (ev.photo) safeUnlinkUpload(ev.photo);
    }
    await Event.deleteMany({});
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to clear events' }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.photo) safeUnlinkUpload(event.photo);
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to delete event' }); }
});

module.exports = router;
