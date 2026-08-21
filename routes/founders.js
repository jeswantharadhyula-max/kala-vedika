const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Founder = require('../models/Founder');
const { requireAdmin } = require('../middleware/auth');
const { createUploader, safeUnlinkUpload } = require('../middleware/fileHelper');

const upload = createUploader('founder');

router.get('/', async (req, res) => {
  try {
    const founders = await Founder.find().sort({ display_order: 1 });
    res.json(founders);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch founders' }); }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid founder ID' });
    }
    const founder = await Founder.findById(req.params.id);
    if (!founder) return res.status(404).json({ error: 'Founder not found' });
    res.json(founder);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch founder' }); }
});

router.post('/', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const { name, designation, department, bio, year, display_order } = req.body;
    if (!name || !designation) {
      if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
      return res.status(400).json({ error: 'Name and designation are required' });
    }
    const photo = req.file ? '/uploads/' + req.file.filename : null;
    const founder = new Founder({
      name: String(name).trim(),
      designation: String(designation).trim(),
      department: department ? String(department).trim() : '',
      bio: bio ? String(bio).trim() : '',
      year: year ? String(year).trim() : '',
      display_order: Number(display_order) || 0,
      photo
    });
    await founder.save();
    res.status(201).json(founder);
  } catch (e) {
    if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
    res.status(500).json({ error: 'Failed to save founder' });
  }
});

router.put('/:id', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
      return res.status(400).json({ error: 'Invalid founder ID' });
    }
    const founder = await Founder.findById(req.params.id);
    if (!founder) {
      if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
      return res.status(404).json({ error: 'Founder not found' });
    }
    if (req.file) {
      if (founder.photo) safeUnlinkUpload(founder.photo);
      founder.photo = '/uploads/' + req.file.filename;
    }
    const { name, designation, department, bio, year, display_order } = req.body;
    if (name) founder.name = String(name).trim();
    if (designation) founder.designation = String(designation).trim();
    if (department !== undefined) founder.department = String(department).trim();
    if (bio !== undefined) founder.bio = String(bio).trim();
    if (year !== undefined) founder.year = String(year).trim();
    if (display_order !== undefined) founder.display_order = Number(display_order);
    await founder.save();
    res.json(founder);
  } catch (e) {
    if (req.file) safeUnlinkUpload('/uploads/' + req.file.filename);
    res.status(500).json({ error: 'Failed to update founder' });
  }
});

router.delete('/all', requireAdmin, async (req, res) => {
  try {
    const founders = await Founder.find({});
    for (const f of founders) {
      if (f.photo) safeUnlinkUpload(f.photo);
    }
    await Founder.deleteMany({});
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to clear founders' }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid founder ID' });
    }
    const founder = await Founder.findById(req.params.id);
    if (!founder) return res.status(404).json({ error: 'Founder not found' });
    if (founder.photo) safeUnlinkUpload(founder.photo);
    await Founder.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to delete founder' }); }
});

module.exports = router;
