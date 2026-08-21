const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const Admin = require('../models/Admin');
const { generateAdminToken, verifyAdminToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');

// Rate limit login attempts: max 15 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const cleanEmail = email.trim();
    const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const admin = await Admin.findOne({ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = bcrypt.compareSync(password, admin.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    // Set session cookie if session middleware is available
    if (req.session) {
      req.session.adminId = admin._id;
      req.session.adminEmail = admin.email;
    }
    
    // Generate stateless token for reliable mobile/Safari/Render proxy authentication
    const token = generateAdminToken(admin._id, admin.email);
    res.json({ success: true, email: admin.email, token });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => res.json({ success: true }));
  } else {
    res.json({ success: true });
  }
});

router.get('/me', (req, res) => {
  // 1. Session check
  if (req.session && req.session.adminId) {
    return res.json({ loggedIn: true, email: req.session.adminEmail });
  }
  // 2. Token check
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
  const token = authHeader ? (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader) : null;
  const payload = verifyAdminToken(token);
  if (payload) {
    return res.json({ loggedIn: true, email: payload.email });
  }
  res.json({ loggedIn: false });
});

module.exports = router;
