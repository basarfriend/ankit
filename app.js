const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (!process.env.MONGO_URI || !process.env.SESSION_SECRET) {
  throw new Error('MONGO_URI and SESSION_SECRET must be set in the project .env file before starting Tixly.');
}

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const helmet = require('helmet');
const methodOverride = require('method-override');
const { attachUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errors');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const ticketRoutes = require('./routes/tickets');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { styleSrc: ["'self'", "'unsafe-inline'"], styleSrcAttr: ["'unsafe-inline'"] } } }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
app.use(session({
  name: 'tixly.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, collectionName: 'sessions' }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(flash());
app.use(attachUser);
app.use((req, res, next) => {
  res.locals.successMessages = req.flash('success');
  res.locals.errorMessages = req.flash('error');
  res.locals.formErrors = req.flash('formErrors')[0] || {};
  res.locals.formValues = req.flash('formValues')[0] || {};
  res.locals.currentPath = req.path;
  next();
});

app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/tickets', ticketRoutes);
app.use('/notifications', notificationRoutes);
app.use('/admin', adminRoutes);
app.use('/reports', reportRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
