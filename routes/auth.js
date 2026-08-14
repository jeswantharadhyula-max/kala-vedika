const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const Admin = require('../models/Admin');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const admin = await Admin.findOne({ email: email.trim() });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = bcrypt.compareSync(password, admin.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.adminId = admin._id;
    req.session.adminEmail = admin.email;
    res.json({ success: true, email: admin.email });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.get('/me', (req, res) => {
  if (req.session.adminId) res.json({ loggedIn: true, email: req.session.adminEmail });
  else res.json({ loggedIn: false });
});

module.exports = router;
