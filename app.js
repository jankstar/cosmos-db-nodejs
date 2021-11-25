var express = require('express');
var passport = require('passport');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var logger = require('morgan');
var { v4: uuidv4 } = require('uuid');
const ejs = require('ejs')
const favicon = require('serve-favicon');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var privateRouter = require('./routes/private');
var adminRouter = require('./routes/admin');

//const db = require('./src/db')

const { TITLE, COOKIENAME } = require('./config.js');

var app = express();

const KEY1 = uuidv4();
const expiryDate = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

ejs.openDelimiter = "'<";
ejs.closeDelimiter = ">'";

require('./boot/db')();
require('./boot/auth')();

// view engine setup
app.set('views', path.join(__dirname, 'client'));
app.engine('html', ejs.renderFile)
app.set('view engine', 'html');
app.use(favicon(path.join(__dirname, '', '', 'favicon.ico')));
app.set('title', TITLE)

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
  name: COOKIENAME,
  secret: KEY1,
  resave: false,
  saveUninitialized: true,
  expires: expiryDate
}));
app.use(function (req, res, next) {
  //move the last login messages from req to res.locals
  var msgs = req.session.messages || [];
  res.locals.messages = msgs;
  res.locals.hasMessages = !!msgs.length;
  req.session.messages = [];
  next();
});
app.use(passport.initialize());
app.use(passport.authenticate('session'));

function adminCheck(req, res, next) {
  if (req.user && req.user.role && req.user.role.includes('admin')) {
    ensureLoggedIn('/')(req, res, next);
  } else {
    res.redirect('/private/home');
  }
}

// Define routes.
app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/static', ensureLoggedIn('/'), express.static(path.join(__dirname, 'static')));
app.use('/private', ensureLoggedIn('/'), privateRouter);
app.use('/admin', adminCheck, adminRouter);

module.exports = app;
