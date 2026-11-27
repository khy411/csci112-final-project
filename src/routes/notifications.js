// src/routes/notifications.js + settings (AP-14, AP-15, AP-16)
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const notifications = require('../queries/notifications');
const patients = require('../queries/patients');

const router = express.Router();
router.use(requireAuth);

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// AP-14 list + unread count
router.get('/notifications', wrap(async (req, res) => {
  const patientId = req.session.patientId;
  const [list, unread] = await Promise.all([
    notifications.getNotifications(patientId),
    notifications.countUnread(patientId),
  ]);
  res.render('notifications', { list, unread });
}));

// AP-15 mark as read
router.post('/notifications/:id/read', wrap(async (req, res) => {
  await notifications.markAsRead(req.session.patientId, req.params.id);
  res.redirect('/notifications');
}));

// AP-16 notification preference
router.get('/settings', wrap(async (req, res) => {
  const patient = await patients.findPatientById(req.session.patientId);
  res.render('settings', { method: patient.notification_method });
}));

router.post('/settings/notification-method', wrap(async (req, res) => {
  try {
    await patients.updateNotificationMethod(req.session.patientId, req.body.method);
  } catch (err) {
    return res.status(400).send(err.message);
  }
  res.redirect('/settings');
}));

module.exports = router;
