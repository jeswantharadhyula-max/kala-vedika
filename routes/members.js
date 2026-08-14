const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Member = require('../models/Member');
const { requireAdmin } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => cb(null, 'member_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.json(members);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const { name, department, section, role, bio, roll_no, gen, year } = req.body;
    if (!name || !department || !section || !roll_no || !gen) return res.status(400).json({ error: 'Name, department, section, roll_no, gen are required' });
    const photo = req.file ? '/uploads/' + req.file.filename : null;
    const member = new Member({ name, roll_no, department, section, gen, year: year || '', role: role || 'Member', bio: bio || '', photo });
    await member.save();
    res.status(201).json(member);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (req.file) {
      if (member.photo) { const old = path.join(__dirname, '../public', member.photo); if (fs.existsSync(old)) fs.unlinkSync(old); }
      member.photo = '/uploads/' + req.file.filename;
    }
    const { name, department, section, role, bio, roll_no, gen, year } = req.body;
    if (name) member.name = name;
    if (roll_no) member.roll_no = roll_no;
    if (department) member.department = department;
    if (section) member.section = section;
    if (gen) member.gen = gen;
    if (year !== undefined) member.year = year;
    if (role) member.role = role;
    if (bio !== undefined) member.bio = bio;
    await member.save();
    res.json(member);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.photo) { const old = path.join(__dirname, '../public', member.photo); if (fs.existsSync(old)) fs.unlinkSync(old); }
    await Member.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
