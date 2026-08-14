const mongoose = require('mongoose');
const achievementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'General' },
  date: { type: String, default: '' },
  photo: { type: String, default: null }
}, { timestamps: true });
module.exports = mongoose.model('Achievement', achievementSchema);
