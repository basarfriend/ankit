const Notification = require('../models/Notification');
const User = require('../models/User');

async function attachUser(req, res, next) {
  res.locals.currentUser = null;
  res.locals.unreadNotificationCount = 0;
  if (!req.session.user) return next();
  try {
    const user = await User.findById(req.session.user.id).select('name email role');
    if (!user) {
      req.session.user = null;
      return next();
    }
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.locals.currentUser = req.session.user;
    res.locals.unreadNotificationCount = await Notification.countDocuments({ recipient: user._id, read: false });
    next();
  } catch (error) {
    next(error);
  }
}

function isLoggedIn(req, res, next) {
  if (req.session.user) return next();
  req.flash('error', 'Please log in to continue.');
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return isLoggedIn(req, res, next);
    if (!roles.includes(req.session.user.role)) {
      req.flash('error', 'You do not have permission to access that page.');
      return res.redirect('/dashboard');
    }
    return next();
  };
}

module.exports = { attachUser, isLoggedIn, allowRoles };
