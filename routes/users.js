var express = require('express');
var crypto = require('crypto');
var db = require('../db');

var router = express.Router();

router.get('/new', function (req, res, next) {
  res.render('signup');
});

router.post('/', function (req, res, next) {
  var salt = crypto.randomBytes(16);
  crypto.pbkdf2(req.body.password, salt, 310000, 32, 'sha256', async function (err, hashedPassword) {
    if (err) { return next(err); }
    try {
      const { resource: user } = await db.User.items
        .create({
          "id": req.body.username,
          "name": req.body.username,
          "salt": JSON.stringify(salt),
          "avatar": "",
          "password": JSON.stringify(hashedPassword),
          "lastLogin": ""
        });

      req.login(user, function (err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
    } catch (err) {
      next(err);
    }
  });
});


module.exports = router;
