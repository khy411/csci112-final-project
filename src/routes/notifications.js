// src/routes/notifications.js + settings (AP-14, AP-15, AP-16)
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const notifications = require('../queries/notifications');
const patients = require('../queries/patients');

const router = express.Router();
router.use(requireAuth);

router.get('/notifications', async (req, res) => {
  // pending: list = getNotifications(...), unread = countUnread(...)
  res.render('notifications', { list: [], unread: 0 });
});

router.post('/notifications/:id/read', async (req, res) => {
  // pending: notifications.markAsRead(req.session.patientId, req.params.id); redirect back
  res.redirect('/notifications');
});

router.get('/settings', (req, res) => res.render('settings'));

router.post('/settings/notification-method', async (req, res) => {
  // pending: patients.updateNotificationMethod(req.session.patientId, req.body.method)
  res.redirect('/settings');
});

module.exports = router;
