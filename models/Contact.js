const mongoose = require('mongoose');
const contactSchema = new mongoose.Schema({
  location: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  hours: { type: String, default: '' }
});
module.exports = mongoose.model('Contact', contactSchema);
