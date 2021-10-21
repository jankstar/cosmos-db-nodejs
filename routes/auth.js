var express = require('express');
var passport = require('passport');
var crypto = require('crypto');
var ensureLoggedOut = require('connect-ensure-login').ensureLoggedOut;
const { RateLimiterMemory } = require('rate-limiter-flexible');

var router = express.Router();
var db = require('../src/db');

const maxWrongAttemptsByIPperDay = 10;
const maxConsecutiveFailsByUsernameAndIP = 10;

const limiterSlowBruteByIP = new RateLimiterMemory({
  keyPrefix: 'login_fail_ip_per_day',
  points: maxWrongAttemptsByIPperDay,
  duration: 60 * 60 * 24,
  blockDuration: 60 * 60 * 24, // Block for 1 day, if 10 wrong attempts per day
});

const limiterConsecutiveFailsByUsernameAndIP = new RateLimiterMemory({
  keyPrefix: 'login_fail_consecutive_username_and_ip',
  points: maxConsecutiveFailsByUsernameAndIP,
  duration: 60 * 60 * 24 * 90, // Store number for 90 days since first fail
  blockDuration: 60 * 60, // Block for 1 hour
});
const getUsernameIPkey = (username, ip) => `${username}_${ip}`;


/**
 * router url '/login'
 */
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
            "role": "new",
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

router.post('/login',
  //check
  async (req, res, next) => {

    try {
      if (!req.body.username && req.headers.authorization) {
        var splitstring = req.headers.authorization.split(' ');
        if (splitstring && splitstring.length == 2 && splitstring[0] == 'Basic' && splitstring[1]) {
          var userPasswd = Buffer.from(splitstring[1], 'base64').toString('utf-8');
          var splitUserPasswd = userPasswd.split(':');
          if (splitUserPasswd && splitUserPasswd.length == 2) {
            req.body.username = splitUserPasswd[0];
            req.body.password = splitUserPasswd[1];
          }
        }
      }
    } catch (err) {

    }

    const ipAddr = req.ip;
    const usernameIPkey = getUsernameIPkey(req.body.username, ipAddr);

    const [resUsernameAndIP, resSlowByIP] = await Promise.all([
      limiterConsecutiveFailsByUsernameAndIP.get(usernameIPkey),
      limiterSlowBruteByIP.get(ipAddr),
    ]);

    let retrySecs = 0;

    // Check if IP or Username + IP is already blocked
    if (resSlowByIP !== null && resSlowByIP.consumedPoints > maxWrongAttemptsByIPperDay) {
      retrySecs = Math.round(resSlowByIP.msBeforeNext / 1000) || 1;
    } else if (resUsernameAndIP !== null && resUsernameAndIP.consumedPoints > maxConsecutiveFailsByUsernameAndIP) {
      retrySecs = Math.round(resUsernameAndIP.msBeforeNext / 1000) || 1;
    }

    if (retrySecs > 0) {
      var retray_std = Math.round(retrySecs / 3600);
      req.session.messages.push(`Ungültiger User oder Passwort - nächster Versuch: ${retray_std} Stunden.`);
      res.set('Retry-After', String(retrySecs) || 1);
      res.status(429).redirect('/');
    } else {

      passport.authenticate('local', async (error, user, info) => {
        if (error || !user) {
          //error
          // Consume 1 point from limiters on wrong attempt and block if limits reached
          try {
            const promises = [limiterSlowBruteByIP.consume(ipAddr)];
            if (user) {
              // Count failed attempts by Username + IP only for registered users
              promises.push(limiterConsecutiveFailsByUsernameAndIP.consume(usernameIPkey));
            }

            await Promise.all(promises);

            req.session.messages.push('Ungültiger User oder Passwort');
            res.status(429).redirect('/');
          } catch (rlRejected) {
            if (rlRejected instanceof Error) {
              throw rlRejected;
            } else {
              var retray_sec = Math.round(rlRejected.msBeforeNext / 1000);
              var retray_std = Math.round(retray_sec / 3600);
              req.session.messages.push(`Ungültiger User oder Passwort - nächster Versuch: ${retray_std} Stunden.`);
              res.set('Retry-After', String(retray_sec) || 1);
              res.status(429).redirect('/');
            }
          }
        } else {
          //success login and go to next()
          req.logIn(user, function (err) {
            if (err) { return next(err); }
            return next();
          });
        }
      })(req, res, next);
    }

  },
  //success
  (req, res) => {
    res.redirect('/private/home');
  });

router.get('/log-out', function (req, res) {
  req.logout();
  res.redirect('/');
});

module.exports = router;
