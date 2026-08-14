const mongoose = require('mongoose');
const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  roll_no: { type: String, required: true },
  department: { type: String, required: true },
  section: { type: String, required: true },
  gen: { type: String, required: true },
  year: { type: String, default: '' },
  role: { type: String, default: 'Member' },
  bio: { type: String, default: '' },
  photo: { type: String, default: null }
}, { timestamps: true });
module.exports = mongoose.model('Member', memberSchema);
