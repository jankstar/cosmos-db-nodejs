/**
 * Modul - boot sequence for DB
 */
var db = require('../src/db');

module.exports = async function () {
  const { resources: rows } = await db.User.items
    .query("SELECT * FROM user AS c WHERE c.name = 'admin'")
    .fetchAll();
  if (!(rows) || !(rows[0])) {
    //User admin noch nicht definiert
  } else {
    //User admin schon definiert
  }
};
