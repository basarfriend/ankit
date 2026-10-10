const bcrypt = require('bcryptjs');
const { matchedData } = require('express-validator');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

exports.users = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).select('name email role createdAt');
  res.render('admin/users', { title: 'Manage users', users });
});

exports.updateRole = asyncHandler(async (req, res) => {
  const { role } = matchedData(req, { locations: ['body'] });
  const user = await User.findById(req.params.id);
  if (!user) {
    req.flash('error', 'User not found.');
    return res.redirect('/admin/users');
  }
  if (user.id === req.session.user.id && role !== 'Admin') {
    req.flash('error', 'You cannot remove your own administrator role.');
    return res.redirect('/admin/users');
  }
  if (user.role === 'Admin' && role !== 'Admin' && await User.countDocuments({ role: 'Admin' }) <= 1) {
    req.flash('error', 'The last administrator cannot be demoted.');
    return res.redirect('/admin/users');
  }
  user.role = role;
  await user.save();
  req.flash('success', `Updated ${user.name}'s role to ${role}.`);
  res.redirect('/admin/users');
});

exports.removeUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    req.flash('error', 'User not found.');
    return res.redirect('/admin/users');
  }
  if (user.id === req.session.user.id) {
    req.flash('error', 'You cannot delete your own account here.');
    return res.redirect('/admin/users');
  }
  if (user.role === 'Admin' && await User.countDocuments({ role: 'Admin' }) <= 1) {
    req.flash('error', 'The last administrator cannot be deleted.');
    return res.redirect('/admin/users');
  }
  const createdTickets = await Ticket.find({ createdBy: user._id }).select('_id');
  const ids = createdTickets.map((ticket) => ticket._id);
  await Promise.all([
    Comment.deleteMany({ $or: [{ author: user._id }, { ticket: { $in: ids } }] }),
    Notification.deleteMany({ $or: [{ recipient: user._id }, { ticket: { $in: ids } }] }),
    Ticket.deleteMany({ createdBy: user._id }),
    Ticket.updateMany({ assignedTo: user._id }, { $set: { assignedTo: null } }),
    User.deleteOne({ _id: user._id })
  ]);
  req.flash('success', `Deleted user ${user.name} and their tickets.`);
  res.redirect('/admin/users');
});

exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = matchedData(req, { locations: ['body'] });
  if (await User.exists({ email })) {
    req.flash('error', 'That email address is already registered.');
    req.flash('formErrors', { email: 'An account with this email already exists.' });
    req.flash('formValues', { name, email, role });
    return res.redirect('/admin/users');
  }
  await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role });
  req.flash('success', `Created ${role.toLowerCase()} account for ${name}.`);
  res.redirect('/admin/users');
});
