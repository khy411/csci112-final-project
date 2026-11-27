// src/routes/labSim.js - DEMO ONLY: simulates the laboratory (AP-01 to AP-05). Not behind login.
const express = require('express');
const { publishAndNotify } = require('../services/publishService');
const { setForceFail, isForceFail } = require('../services/notifier');
const { retryFailed } = require('../jobs/retryNotifications');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Lab approves an order: POST /lab/approve/R-000099
router.post('/lab/approve/:reportId', wrap(async (req, res) => {
  res.json(await publishAndNotify(req.params.reportId));
}));

// Make sends fail / succeed: POST /lab/force-fail/on  or  /lab/force-fail/off
router.post('/lab/force-fail/:state', (req, res) => {
  setForceFail(req.params.state === 'on');
  res.json({ forceFail: isForceFail() });
});

// Run the retry pass now instead of waiting for the timer: POST /lab/retry-now
router.post('/lab/retry-now', wrap(async (req, res) => {
  res.json(await retryFailed());
}));

module.exports = router;
