const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { requireAdmin } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');

// Rate limit feedback submissions: max 5 per 10 minutes per IP
const feedbackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Too many feedback submissions from your IP. Please try again later.' }
});

router.get('/', requireAdmin, async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedback);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', feedbackLimiter, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required' });
    
    // Length sanitization
    const safeName = String(name).trim().slice(0, 100);
    const safeEmail = String(email).trim().slice(0, 150);
    const safeMessage = String(message).trim().slice(0, 2000);
    
    if (safeName.length < 2 || safeMessage.length < 5) {
      return res.status(400).json({ error: 'Please enter a valid name and message.' });
    }
    
    const feedback = new Feedback({ name: safeName, email: safeEmail, message: safeMessage });
    await feedback.save();
    res.status(201).json({ success: true, message: 'Feedback received' });
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
