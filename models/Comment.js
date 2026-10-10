const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, trim: true, maxlength: 3000 }
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
