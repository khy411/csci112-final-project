// src/routes/labSim.js - DEMO ONLY: simulates the laboratory approving an order (AP-01 to AP-04)
const express = require('express');
const { publishAndNotify } = require('../services/publishService');
const router = express.Router();

router.post('/lab/approve/:reportId', async (req, res) => {
  // pending: await publishAndNotify(req.params.reportId); res.json(...)
  res.status(501).json({ todo: true });
});

module.exports = router;
