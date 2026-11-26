// src/app.js - entry point
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const { connect } = require('./db');
const retryJob = require('./jobs/retryNotifications');

async function main() {
  await connect();

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true },
  }));

  app.use(require('./routes/auth'));
  app.use(require('./routes/results'));
  app.use(require('./routes/notifications'));
  app.use(require('./routes/labSim'));

  retryJob.start();

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`LIS portal on http://localhost:${port}`));
}

main().catch((err) => { console.error(err); process.exit(1); });
