// src/app.js - entry point (serves the SPA + JSON API from one origin so the session cookie just works)
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const { connect } = require('./db');
const requireAuth = require('./middleware/requireAuth');
const retryJob = require('./jobs/retryNotifications');

async function main() {
  await connect();

  const app = express();
  app.set('view engine', 'ejs');               // still used by the login page
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' },
  }));

  // static frontend files (index.html, app.js, src/api.js, css). index:false so "/" goes through the login check below
  app.use(express.static(path.join(__dirname, 'public'), { index: false }));

  app.use(require('./routes/auth'));            // GET/POST /login, POST /logout
  app.use('/api', require('./routes/api'));     // JSON API used by the SPA
  app.use(require('./routes/labSim'));          // demo only: simulate the lab

  // the portal itself: logged-in patients get the SPA, everyone else goes to /login
  app.get('/', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

  // errors: JSON for /api, plain text otherwise
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error(err);
    if (req.originalUrl.startsWith('/api')) return res.status(500).json({ error: 'Something went wrong' });
    res.status(500).send('Something went wrong');
  });

  retryJob.start();

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`LIS portal on http://localhost:${port}`));
}

main().catch((err) => { console.error(err); process.exit(1); });
