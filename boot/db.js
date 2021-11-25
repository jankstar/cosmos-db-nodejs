/**
 * Modul - boot sequence for DB
 */
var db = require('../src/db');

module.exports = async function () {
  try {
    const { resources: rows } = await db.User.items
      .query("SELECT * FROM c WHERE c.username = 'admin'")
      .fetchAll();

    if (!(rows) || !(rows[0])) {
      //User admin noch nicht definiert
    } else {
      //User admin schon definiert
    }
  } catch (error) {
    console.log(error.message)
  }
};
