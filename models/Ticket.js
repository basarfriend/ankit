const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now }
}, { _id: false });

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: Number, unique: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  category: { type: String, enum: ['Bug', 'Access', 'Billing', 'Booking', 'General'], default: 'General' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  statusHistory: { type: [historySchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
