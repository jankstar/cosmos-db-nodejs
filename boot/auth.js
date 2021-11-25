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
        const { resource: row } = await db.User.item(username, username).read();
          //.query(`SELECT * FROM c WHERE c.username = '${username}' `)
          //.fetchAll();
        if (!row) { return cb(null, false, { message: 'Incorrect username or password.' }); }

        var salt = Buffer.from(JSON.parse(row.salt));

        crypto.pbkdf2(password, salt, 310000, 32, 'sha256', function (err, hashedPassword) {
          if (err) { return cb(err); }
          try {
            var password = Buffer.from(JSON.parse(row.password));
            if (!crypto.timingSafeEqual(password, hashedPassword)) {
              return cb(null, false, { message: 'Incorrect username or password.' });
            }
            var user = {
              id: row.id,
              username: row.username,
              avatar: row.avatar || "",
              role: row.role || "",
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
      cb(null, { id: user.id, username: user.username, avatar: user.avatar, role: user.role, });
    });
  });

  passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
      return cb(null, user);
    });
  });

};
