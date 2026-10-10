const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

exports.index = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.session.user.id })
    .sort({ createdAt: -1 }).limit(100).populate('ticket', 'ticketNumber');
  res.render('notifications/index', { title: 'Notifications', notifications });
});

exports.markRead = asyncHandler(async (req, res) => {
  const query = { recipient: req.session.user.id };
  if (req.params.id !== 'all') query._id = req.params.id;
  await Notification.updateMany(query, { $set: { read: true } });
  req.flash('success', req.params.id === 'all' ? 'All notifications marked as read.' : 'Notification marked as read.');
  res.redirect('/notifications');
});
