require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const Comment = require('./models/Comment');
const Counter = require('./models/Counter');

const demoUsers = [
  { name: 'Alex Admin', email: 'admin@tixly.demo', password: 'Admin123!', role: 'Admin' },
  { name: 'Avery Agent', email: 'agent@tixly.demo', password: 'Agent123!', role: 'Agent' },
  { name: 'Taylor User', email: 'user@tixly.demo', password: 'User123!', role: 'User' }
];

const sampleTickets = [
  { title: 'Unable to reset my password', description: 'The password reset link expires immediately when I click it. I have tried requesting a fresh link twice.', category: 'Access', priority: 'High', status: 'Open' },
  { title: 'Booking confirmation not received', description: 'I completed a booking yesterday but have not received the confirmation email. The payment is showing as processed.', category: 'Booking', priority: 'Urgent', status: 'Open' },
  { title: 'App crashes on the payments page', description: 'The application closes whenever I open payment methods on my Android phone. I am using the latest app version.', category: 'Bug', priority: 'High', status: 'In Progress' },
  { title: 'Please update the billing address', description: 'I moved recently and need the new billing address reflected on my account invoices.', category: 'Billing', priority: 'Medium', status: 'Resolved' },
  { title: 'Cannot sign in with my work email', description: 'My account says the email address is not recognized, although I have used it for previous bookings.', category: 'Access', priority: 'Medium', status: 'Open' },
  { title: 'Duplicate charge for one reservation', description: 'My card statement shows two charges for a single reservation. Please help verify and reverse the duplicate.', category: 'Billing', priority: 'Urgent', status: 'In Progress' },
  { title: 'Change the date of my booking', description: 'I need to move my reservation to the following weekend. Please let me know which dates are available.', category: 'Booking', priority: 'Low', status: 'Resolved' },
  { title: 'Search results are missing older tickets', description: 'Searching for a ticket number from last month does not return any results, even though the ticket is still in my account.', category: 'Bug', priority: 'Medium', status: 'Closed' },
  { title: 'Request an invoice copy', description: 'Could you send me a copy of the invoice for my most recent booking for expense reporting?', category: 'Billing', priority: 'Low', status: 'Open' },
  { title: 'General question about account settings', description: 'I would like to know how to update the phone number associated with my profile.', category: 'General', priority: 'Low', status: 'Closed' }
];

async function seed() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be set in .env before seeding.');
  await mongoose.connect(process.env.MONGO_URI);
  const users = {};
  for (const account of demoUsers) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    users[account.role] = await User.findOneAndUpdate(
      { email: account.email },
      { $set: { name: account.name, passwordHash, role: account.role } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  const existingTickets = await Ticket.countDocuments();
  if (existingTickets === 0) {
    const tickets = sampleTickets.map((sample, index) => {
      const createdBy = index % 2 === 0 ? users.User._id : users.Agent._id;
      const changedBy = sample.status === 'Open' ? createdBy : users.Agent._id;
      const history = [{ status: 'Open', changedBy: createdBy, date: new Date(Date.now() - (index + 3) * 86400000) }];
      if (sample.status !== 'Open') history.push({ status: 'In Progress', changedBy: users.Agent._id, date: new Date(Date.now() - (index + 2) * 86400000) });
      if (['Resolved', 'Closed'].includes(sample.status)) history.push({ status: 'Resolved', changedBy: users.Agent._id, date: new Date(Date.now() - (index + 1) * 86400000) });
      if (sample.status === 'Closed') history.push({ status: 'Closed', changedBy: users.Agent._id, date: new Date(Date.now() - index * 86400000) });
      return {
        ...sample, ticketNumber: 1001 + index, createdBy,
        assignedTo: index % 3 === 0 ? null : users.Agent._id,
        statusHistory: history,
        createdAt: new Date(Date.now() - (index + 3) * 86400000),
        updatedAt: new Date(Date.now() - (index + 1) * 86400000)
      };
    });
    const inserted = await Ticket.insertMany(tickets);
    await Counter.findByIdAndUpdate('ticket', { $set: { sequence: 1010 } }, { upsert: true, setDefaultsOnInsert: true });
    await Comment.insertMany([
      { ticket: inserted[2]._id, author: users.Agent._id, message: 'Thanks for reporting this. We are checking the latest Android logs now.' },
      { ticket: inserted[2]._id, author: users.User._id, message: 'I can share a screen recording if that helps.' },
      { ticket: inserted[3]._id, author: users.Agent._id, message: 'The billing address has been updated. Please check your account settings.' },
      { ticket: inserted[5]._id, author: users.Agent._id, message: 'We are reviewing the duplicate transaction with our payments provider.' }
    ]);
  } else {
    const latestTicket = await Ticket.findOne().sort({ ticketNumber: -1 }).select('ticketNumber');
    await Counter.findByIdAndUpdate('ticket', { $max: { sequence: latestTicket ? latestTicket.ticketNumber : 1000 } }, { upsert: true });
  }

  console.log('Seed complete. Demo logins:');
  demoUsers.forEach(({ email, password, role }) => console.log(`  ${role}: ${email} / ${password}`));
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
