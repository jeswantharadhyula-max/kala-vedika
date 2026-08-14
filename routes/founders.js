const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Founder = require('../models/Founder');
const { requireAdmin } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => cb(null, 'founder_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  try {
    const founders = await Founder.find().sort({ display_order: 1 });
    res.json(founders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const { name, designation, department, bio, year, display_order } = req.body;
    if (!name || !designation) return res.status(400).json({ error: 'Name and designation are required' });
    const photo = req.file ? '/uploads/' + req.file.filename : null;
    const founder = new Founder({ name, designation, department: department || '', bio: bio || '', year: year || '', display_order: Number(display_order) || 0, photo });
    await founder.save();
    res.status(201).json(founder);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const founder = await Founder.findById(req.params.id);
    if (!founder) return res.status(404).json({ error: 'Founder not found' });
    if (req.file) {
      if (founder.photo) { const old = path.join(__dirname, '../public', founder.photo); if (fs.existsSync(old)) fs.unlinkSync(old); }
      founder.photo = '/uploads/' + req.file.filename;
    }
    const { name, designation, department, bio, year, display_order } = req.body;
    if (name) founder.name = name;
    if (designation) founder.designation = designation;
    if (department !== undefined) founder.department = department;
    if (bio !== undefined) founder.bio = bio;
    if (year !== undefined) founder.year = year;
    if (display_order !== undefined) founder.display_order = Number(display_order);
    await founder.save();
    res.json(founder);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const founder = await Founder.findById(req.params.id);
    if (!founder) return res.status(404).json({ error: 'Founder not found' });
    if (founder.photo) { const old = path.join(__dirname, '../public', founder.photo); if (fs.existsSync(old)) fs.unlinkSync(old); }
    await Founder.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
