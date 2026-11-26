// src/middleware/requireAuth.js - nothing is reachable until a session exists
module.exports = function requireAuth(req, res, next) {
  if (!req.session || !req.session.patientId) return res.redirect('/login');
  next();
};
