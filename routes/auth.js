var express = require('express');
var passport = require('passport');
var crypto = require('crypto');
var ensureLoggedOut = require('connect-ensure-login').ensureLoggedOut;
var router = express.Router();
var db = require('../src/db');

router.get('/login',
  ensureLoggedOut({ redirectTo: '/private/home' }),
  function (req, res, next) {
    res.redirect('/');
  });

router.post('/new', function (req, res, next) {
  var salt = crypto.randomBytes(16);
  crypto.pbkdf2(req.body.password, salt, 310000, 32, 'sha256',
    async (err, hashedPassword) => {
      if (err) { return next(err); }
      try {
        const { resource: user } = await db.User.items
          .create({
            "id": req.body.username,
            "username": req.body.username,
            "salt": JSON.stringify(salt),
            "role": "newbi",
            "avatar": "",
            "password": JSON.stringify(hashedPassword),
            "lastLogin": ""
          });

        req.login(user, function (err) {
          if (err) { return next(err); }
          res.redirect('/private/home');
        });
      } catch (err) {
        next(err);
      }
    });
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/private/home',
  failureRedirect: '/',
  failureMessage: true
}));

router.get('/log-out', function(req, res, next) {
  req.logout();
  res.redirect('/');
});

module.exports = router;
