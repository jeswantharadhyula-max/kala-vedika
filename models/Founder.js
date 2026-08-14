const mongoose = require('mongoose');
const founderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  designation: { type: String, required: true },
  department: { type: String, default: '' },
  bio: { type: String, default: '' },
  year: { type: String, default: '' },
  display_order: { type: Number, default: 0 },
  photo: { type: String, default: null }
}, { timestamps: true });
module.exports = mongoose.model('Founder', founderSchema);
