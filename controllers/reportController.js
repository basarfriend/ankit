const Ticket = require('../models/Ticket');
const asyncHandler = require('../utils/asyncHandler');

exports.index = asyncHandler(async (req, res) => {
  const totalTickets = await Ticket.countDocuments();
  const [resolved, unassigned, byStatus, byPriority, byCategory] = await Promise.all([
    Ticket.countDocuments({ status: { $in: ['Resolved', 'Closed'] } }),
    Ticket.countDocuments({ assignedTo: null }),
    Ticket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Ticket.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Ticket.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }])
  ]);
  const map = (rows, keys) => keys.map((name) => ({ name, count: rows.find((row) => row._id === name)?.count || 0 }));
  res.render('reports/index', {
    title: 'Reports', totalTickets, unassigned,
    resolutionRate: totalTickets ? Math.round(resolved / totalTickets * 100) : 0,
    byStatus: map(byStatus, ['Open', 'In Progress', 'Resolved', 'Closed']),
    byPriority: map(byPriority, ['Low', 'Medium', 'High', 'Urgent']),
    byCategory: map(byCategory, ['Bug', 'Access', 'Billing', 'Booking', 'General']),
    maximum: Math.max(totalTickets, 1)
  });
});
