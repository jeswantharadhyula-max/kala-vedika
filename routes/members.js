const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Member = require('../models/Member');
const { requireAdmin } = require('../middleware/auth');
const { createUploader, safeUnlinkUpload } = require('../middleware/fileHelper');

const upload = createUploader('member');

router.get('/', async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.json(members);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch members' }); }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid member ID' });
    }
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch member' }); }
});

router.post('/', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const { name, department, section, role, bio, roll_no, gen, year } = req.body;
    if (!name || !department || !section || !roll_no || !gen) {
      if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
      return res.status(400).json({ error: 'Name, department, section, roll_no, and generation are required' });
    }
    const photo = req.file ? '/uploads/' + req.file.filename : null;
    const member = new Member({
      name: String(name).trim(),
      roll_no: String(roll_no).trim(),
      department: String(department).trim(),
      section: String(section).trim(),
      gen: String(gen).trim(),
      year: year ? String(year).trim() : '',
      role: role ? String(role).trim() : 'Member',
      bio: bio ? String(bio).trim() : '',
      photo
    });
    await member.save();
    res.status(201).json(member);
  } catch (e) {
    if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
    res.status(500).json({ error: 'Failed to save member' });
  }
});

router.put('/:id', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
      return res.status(400).json({ error: 'Invalid member ID' });
    }
    const member = await Member.findById(req.params.id);
    if (!member) {
      if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
      return res.status(404).json({ error: 'Member not found' });
    }
    if (req.file) {
      if (member.photo) safeUnlinkUpload(member.photo);
      member.photo = '/uploads/' + req.file.filename;
    }
    const { name, department, section, role, bio, roll_no, gen, year } = req.body;
    if (name) member.name = String(name).trim();
    if (roll_no) member.roll_no = String(roll_no).trim();
    if (department) member.department = String(department).trim();
    if (section) member.section = String(section).trim();
    if (gen) member.gen = String(gen).trim();
    if (year !== undefined) member.year = String(year).trim();
    if (role) member.role = String(role).trim();
    if (bio !== undefined) member.bio = String(bio).trim();
    await member.save();
    res.json(member);
  } catch (e) {
    if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

router.delete('/all', requireAdmin, async (req, res) => {
  try {
    const members = await Member.find({});
    for (const m of members) {
      if (m.photo) safeUnlinkUpload(m.photo);
    }
    await Member.deleteMany({});
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to clear members' }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid member ID' });
    }
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.photo) safeUnlinkUpload(member.photo);
    await Member.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to delete member' }); }
});

module.exports = router;
