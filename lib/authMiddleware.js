import { roles } from '../config.js';

export const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== roles.admin) {
    return res.status(403).render('error', { message: 'Forbidden' });
  }
  next();
};

export const attachUser = (req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
};
