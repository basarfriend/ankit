const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  message: { type: String, required: true, maxlength: 180 },
  read: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
