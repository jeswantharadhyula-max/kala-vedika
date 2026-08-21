const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { requireAdmin } = require('../middleware/auth');

router.get('/', requireAdmin, async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedback);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required' });
    const feedback = new Feedback({ name, email, message });
    await feedback.save();
    res.status(201).json(feedback);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const mongoose = require('mongoose');

router.delete('/all', requireAdmin, async (req, res) => {
  try {
    await Feedback.deleteMany({});
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ error: 'Feedback not found' });
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
