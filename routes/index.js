var express = require('express');
var router = express.Router();
const { TITLE } = require('../config.js');

/* GET home page. */
router.get('/', function(req, res, next) {
  var msg = '';
  if (res.locals.messages && res.locals.messages[0]) {
    msg = res.locals.messages[0];
  }
  res.render('index', { title: TITLE, message: msg });
});

module.exports = router;
