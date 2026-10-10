const Notification = require('../models/Notification');
const User = require('../models/User');

async function notifyUsers(recipientIds, ticket, message) {
  const ids = [...new Set(recipientIds.filter(Boolean).map(String))];
  if (!ids.length) return;
  await Notification.insertMany(ids.map((recipient) => ({ recipient, ticket: ticket._id, message })));
}

async function notifyStaff(ticket, message) {
  const staff = await User.find({ role: { $in: ['Agent', 'Admin'] } }).select('_id');
  await notifyUsers(staff.map((user) => user._id), ticket, message);
}

module.exports = { notifyUsers, notifyStaff };
