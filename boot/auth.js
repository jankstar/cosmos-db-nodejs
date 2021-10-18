/**
 * Modul boot sequence for passport
 */
var passport = require('passport');
var Strategy = require('passport-local');
var crypto = require('crypto');
var db = require('../src/db');


module.exports = function () {

  // Configure the local strategy for use by Passport.
  //
  // The local strategy requires a `verify` function which receives the credentials
  // (`username` and `password`) submitted by the user.  The function must verify
  // that the password is correct and then invoke `cb` with a user object, which
  // will be set at `req.user` in route handlers after authentication.
  passport.use(new Strategy({},
    async function (username, password, cb) {
      try {
        const { resources: rows } = await db.User.items
          .query({
            query: 'SELECT * FROM c WHERE c.username = @username ',
            parameters: [{ name: "@username", value: username }]
          })
          .fetchAll();
        if (!rows || !rows[0]) { return cb(null, false, { message: 'Incorrect username or password.' }); }
        var salt = Buffer.from(JSON.parse(rows[0].salt));

        crypto.pbkdf2(password, salt, 310000, 32, 'sha256', function (err, hashedPassword) {
          if (err) { return cb(err); }
          try {
            var password = Buffer.from(JSON.parse(rows[0].password));
            if (!crypto.timingSafeEqual(password, hashedPassword)) {
              return cb(null, false, { message: 'Incorrect username or password.' });
            }
            var user = {
              id: rows[0].id,
              username: rows[0].username,
              displayName: rows[0].displayName
            };
            return cb(null, user);
          } catch (err) {
            return cb(null, false, { message: err.message });
          }
        });

      } catch (err) {
        { return cb(null, false, err.message); }
      }

    }));


  // Configure Passport authenticated session persistence.
  //
  // In order to restore authentication state across HTTP requests, Passport needs
  // to serialize users into and deserialize users out of the session.  The
  // typical implementation of this is as simple as supplying the user ID when
  // serializing, and querying the user record by ID from the database when
  // deserializing.
  passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
      cb(null, { id: user.id, username: user.username });
    });
  });

  passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
      return cb(null, user);
    });
  });

};
