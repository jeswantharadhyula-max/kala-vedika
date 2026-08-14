const mongoose = require('mongoose');
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  event_date: { type: String, required: true },
  event_time: { type: String, default: '' },
  venue: { type: String, default: '' },
  category: { type: String, default: 'Cultural' },
  status: { type: String, default: 'upcoming' },
  photo: { type: String, default: null }
}, { timestamps: true });
module.exports = mongoose.model('Event', eventSchema);
