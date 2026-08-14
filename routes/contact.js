const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    let contact = await Contact.findOne();
    if (!contact) {
      contact = new Contact({
        location: "KITS College Campus\nCultural Activities Block\nAndhra Pradesh, India",
        email: "kalavedika@kits.ac.in\ncultural@kits.ac.in",
        phone: "+91 98765 43210\n+91 87654 32109",
        hours: "Mon - Fri: 4 PM - 7 PM\nWeekends: 10 AM - 1 PM"
      });
      await contact.save();
    }
    res.json(contact);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/', requireAdmin, async (req, res) => {
  try {
    const { location, email, phone, hours } = req.body;
    let contact = await Contact.findOne();
    if (!contact) contact = new Contact({});
    if (location !== undefined) contact.location = location;
    if (email !== undefined) contact.email = email;
    if (phone !== undefined) contact.phone = phone;
    if (hours !== undefined) contact.hours = hours;
    await contact.save();
    res.json({ success: true, contact });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
