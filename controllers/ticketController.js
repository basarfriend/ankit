const { matchedData } = require('express-validator');
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Counter = require('../models/Counter');
const Comment = require('../models/Comment');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { notifyStaff, notifyUsers } = require('../utils/notifications');

const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
const staffRole = (user) => ['Agent', 'Admin'].includes(user.role);

async function findVisibleTicket(id, user) {
  if (!mongoose.isValidObjectId(id)) return null;
  const ticket = await Ticket.findById(id).populate('createdBy', 'name email').populate('assignedTo', 'name').populate('statusHistory.changedBy', 'name');
  if (!ticket || (!staffRole(user) && String(ticket.createdBy._id) !== user.id)) return null;
  return ticket;
}

exports.list = asyncHandler(async (req, res) => {
  const user = req.session.user;
  const query = {};
  if (!staffRole(user)) query.createdBy = user.id;
  const { search, status, priority, category } = req.query;
  if (status && statuses.includes(status)) query.status = status;
  if (priority && ['Low', 'Medium', 'High', 'Urgent'].includes(priority)) query.priority = priority;
  if (category && ['Bug', 'Access', 'Billing', 'Booking', 'General'].includes(category)) query.category = category;
  if (typeof search === 'string' && search.trim()) {
    const term = search.trim().slice(0, 100);
    const conditions = [{ title: { $regex: escapeRegex(term), $options: 'i' } }, { description: { $regex: escapeRegex(term), $options: 'i' } }];
    const number = term.replace(/^#/, '');
    if (/^\d+$/.test(number)) conditions.push({ ticketNumber: Number(number) });
    query.$and = [{ $or: conditions }];
  }
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 10;
  const total = await Ticket.countDocuments(query);
  const tickets = await Ticket.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
    .populate('createdBy', 'name').populate('assignedTo', 'name');
  res.render('tickets/index', { title: 'Tickets', tickets, page, pages: Math.max(1, Math.ceil(total / limit)), total, filters: req.query });
});

exports.newForm = (req, res) => res.render('tickets/new', { title: 'New ticket' });

exports.create = asyncHandler(async (req, res) => {
  const fields = matchedData(req, { locations: ['body'] });
  const counter = await Counter.findByIdAndUpdate('ticket', { $inc: { sequence: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  const ticket = await Ticket.create({
    ...fields, ticketNumber: counter.sequence, createdBy: req.session.user.id,
    statusHistory: [{ status: 'Open', changedBy: req.session.user.id }]
  });
  await notifyStaff(ticket, `New ticket #${ticket.ticketNumber}: ${ticket.title}`);
  req.flash('success', `Ticket #${ticket.ticketNumber} was created.`);
  res.redirect(`/tickets/${ticket.id}`);
});

exports.show = asyncHandler(async (req, res) => {
  const ticket = await findVisibleTicket(req.params.id, req.session.user);
  if (!ticket) return res.status(404).render('errors/404', { title: 'Ticket not found' });
  const [comments, agents] = await Promise.all([
    Comment.find({ ticket: ticket._id }).sort({ createdAt: 1 }).populate('author', 'name role'),
    staffRole(req.session.user) ? User.find({ role: { $in: ['Agent', 'Admin'] } }).sort({ name: 1 }).select('name role') : []
  ]);
  return res.render('tickets/show', { title: `Ticket #${ticket.ticketNumber}`, ticket, comments, agents, statuses });
});

exports.editForm = asyncHandler(async (req, res) => {
  const ticket = await findVisibleTicket(req.params.id, req.session.user);
  if (!ticket || ticket.status !== 'Open' || staffRole(req.session.user)) {
    req.flash('error', 'Only your own open tickets can be edited.');
    return res.redirect(ticket ? `/tickets/${ticket.id}` : '/tickets');
  }
  return res.render('tickets/edit', { title: 'Edit ticket', ticket });
});

exports.update = asyncHandler(async (req, res) => {
  const ticket = await findVisibleTicket(req.params.id, req.session.user);
  if (!ticket || ticket.status !== 'Open' || staffRole(req.session.user)) {
    req.flash('error', 'Only your own open tickets can be edited.');
    return res.redirect(ticket ? `/tickets/${ticket.id}` : '/tickets');
  }
  Object.assign(ticket, matchedData(req, { locations: ['body'] }));
  await ticket.save();
  req.flash('success', 'Ticket updated.');
  res.redirect(`/tickets/${ticket.id}`);
});

exports.remove = asyncHandler(async (req, res) => {
  const ticket = await findVisibleTicket(req.params.id, req.session.user);
  if (!ticket || ticket.status !== 'Open' || staffRole(req.session.user)) {
    req.flash('error', 'Only your own open tickets can be deleted.');
    return res.redirect(ticket ? `/tickets/${ticket.id}` : '/tickets');
  }
  await Promise.all([Comment.deleteMany({ ticket: ticket._id }), ticket.deleteOne()]);
  req.flash('success', `Ticket #${ticket.ticketNumber} deleted.`);
  res.redirect('/tickets');
});

exports.changeStatus = asyncHandler(async (req, res) => {
  const ticket = await findVisibleTicket(req.params.id, req.session.user);
  if (!ticket) return res.status(404).render('errors/404', { title: 'Ticket not found' });
  const target = req.body.status;
  const user = req.session.user;
  const allowedByUser = !staffRole(user) && String(ticket.createdBy._id) === user.id
    && ticket.status === 'Resolved' && ['Closed', 'Open'].includes(target);
  const allowedByStaff = staffRole(user) && (
    (ticket.status === 'Open' && target === 'In Progress')
    || (ticket.status === 'In Progress' && target === 'Resolved')
    || (ticket.status === 'Resolved' && ['Closed', 'In Progress'].includes(target))
  );
  if ((!allowedByUser && !allowedByStaff) || target === ticket.status || !statuses.includes(target)) {
    req.flash('error', 'That status change is not allowed.');
    return res.redirect(`/tickets/${ticket.id}`);
  }
  ticket.status = target;
  ticket.statusHistory.push({ status: target, changedBy: user.id });
  await ticket.save();
  await notifyUsers([ticket.createdBy._id], ticket, `Ticket #${ticket.ticketNumber} status changed to ${target}.`);
  req.flash('success', `Ticket status changed to ${target}.`);
  return res.redirect(`/tickets/${ticket.id}`);
});

exports.assign = asyncHandler(async (req, res) => {
  const ticket = await findVisibleTicket(req.params.id, req.session.user);
  if (!ticket) return res.status(404).render('errors/404', { title: 'Ticket not found' });
  const assignee = await User.findOne({ _id: req.body.assignedTo, role: { $in: ['Agent', 'Admin'] } }).select('_id name');
  if (!assignee) {
    req.flash('error', 'Choose a valid agent or administrator.');
    return res.redirect(`/tickets/${ticket.id}`);
  }
  ticket.assignedTo = assignee._id;
  await ticket.save();
  await notifyUsers([assignee._id], ticket, `Ticket #${ticket.ticketNumber} was assigned to you.`);
  req.flash('success', `Ticket assigned to ${assignee.name}.`);
  res.redirect(`/tickets/${ticket.id}`);
});

exports.comment = asyncHandler(async (req, res) => {
  const ticket = await findVisibleTicket(req.params.id, req.session.user);
  if (!ticket) return res.status(404).render('errors/404', { title: 'Ticket not found' });
  if (ticket.status === 'Closed') {
    req.flash('error', 'Closed tickets cannot receive replies.');
    return res.redirect(`/tickets/${ticket.id}`);
  }
  const { message } = matchedData(req, { locations: ['body'] });
  await Comment.create({ ticket: ticket._id, author: req.session.user.id, message });
  let recipients;
  if (staffRole(req.session.user)) {
    recipients = [ticket.createdBy._id];
  } else if (ticket.assignedTo) {
    recipients = [ticket.assignedTo._id];
  } else {
    const staff = await User.find({ role: { $in: ['Agent', 'Admin'] } }).select('_id');
    recipients = staff.map((member) => member._id);
  }
  await notifyUsers(recipients, ticket, `New reply on ticket #${ticket.ticketNumber}.`);
  req.flash('success', 'Your reply was added.');
  res.redirect(`/tickets/${ticket.id}#comments`);
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
