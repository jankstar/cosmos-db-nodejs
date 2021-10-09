var express = require('express');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
var db = require('../db');

var router = express.Router();

/* GET users listing. */
router.get('/',
  ensureLoggedIn(),
  async function (req, res, next) {
    try {
      const { resources: rows } = await db.User.items
        .query(`SELECT * FROM c WHERE c.id = '${req.user.id}'`)
        .fetchAll();
      if (!rows || !rows[0]) {
        throw "User not found"
      }
      //user valid and found
      var user = {
        id: rows[0].id,
        username: rows[0].name,
        displayName: rows[0].name
      };
      res.render('profile', { user: user });

    } catch (err) {
      next(err);
    }
  });

module.exports = router;
