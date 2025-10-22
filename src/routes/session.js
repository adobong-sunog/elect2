const express = require('express');
const router = express.Router();

router.post('/session/leader', (req, res) => {
  const email = (req.body.leader_email || '').trim().toLowerCase();
  if (email) {
    req.session.leaderEmail = email;
    req.flash('success', 'Filtered activities for your email address.');
  } else {
    delete req.session.leaderEmail;
    req.flash('success', 'Showing all activities.');
  }
  res.redirect('/');
});

router.post('/session/leader/clear', (req, res) => {
  delete req.session.leaderEmail;
  req.flash('success', 'Cleared leader filter.');
  res.redirect('/');
});

module.exports = router;
