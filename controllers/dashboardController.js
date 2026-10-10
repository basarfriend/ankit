const Ticket = require('../models/Ticket');
const asyncHandler = require('../utils/asyncHandler');

exports.index = asyncHandler(async (req, res) => {
  const staff = ['Agent', 'Admin'].includes(req.session.user.role);
  const scope = staff ? {} : { createdBy: req.session.user.id };
  const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
  const counts = {};
  await Promise.all(statuses.map(async (status) => {
    counts[status] = await Ticket.countDocuments({ ...scope, status });
  }));
  const attentionQuery = staff
    ? { ...scope, status: 'Open', priority: { $in: ['Urgent', 'High'] } }
    : scope;
  const recentTickets = await Ticket.find(attentionQuery)
    .sort(staff ? { priority: -1, createdAt: -1 } : { createdAt: -1 })
    .limit(6).populate('createdBy', 'name').populate('assignedTo', 'name');
  res.render('dashboard/index', { title: 'Dashboard', counts, recentTickets, staff });
});
