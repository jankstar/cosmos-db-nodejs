var express = require('express');
var crypto = require('crypto');
var db = require('../src/db');
const { TITLE } = require('../config.js');

var router = express.Router();

router.get('/',
    async (req, res) => {
        res.render('admin', {
            title: TITLE
        });
    });


/**
 * change item - it will be change only the concrete fields of table
 *  @table - the name of the table
 *  @body - the item 
 */
router.post('/data/:table',
    async (req, res) => {
        const table = req.params.table;
        try {
            if (table && table == 'user') {
                //find the user to change
                if (!req.body.id) {
                    //new user
                    if (!req.body.newPassword || !req.body.valNewPassword || req.body.newPassword != req.body.valNewPassword) {
                        throw "New Password invalid - reject all";
                    }
                    var salt = crypto.randomBytes(16);
                    crypto.pbkdf2(req.body.newPassword, salt, 310000, 32, 'sha256',
                        async (err, hashedPassword) => {
                            if (err) { return res.status(400).json({ data: err.message }); }
                            try {
                                const { resource: user } = await db.User.items
                                    .create({
                                        "id": req.body.username,
                                        "username": req.body.username,
                                        "salt": JSON.stringify(salt),
                                        "role": req.body.role || "new",
                                        "avatar": req.body.avatar || "",
                                        "password": JSON.stringify(hashedPassword),
                                        "lastLogin": ""
                                    });
                                res.json({ data: user })
                            } catch (err) {
                                res.status(400).json({ data: err.message })
                            }
                        });
                } else {
                    //chnage user
                    const { resources: rows } = await db.User.items
                        .query(`SELECT * FROM c WHERE c.id = '${req.body.id}'`)
                        .fetchAll();
                    if (rows && rows[0] && req.body.role) {
                        rows[0].role = req.body.role
                        if (!req.body.newPassword) {
                            db.User.items.upsert(rows[0]);
                            res.json({ data: rows[0] })
                        } else {
                            //with new password
                            if (!req.body.newPassword || !req.body.valNewPassword || req.body.newPassword != req.body.valNewPassword) {
                                throw "New Password invalid - reject all";
                            }

                            var salt = Buffer.from(JSON.parse(rows[0].salt));
                            crypto.pbkdf2(req.body.newPassword, salt, 310000, 32, 'sha256',
                                async (err, hashedPassword) => {
                                    if (err) { return res.status(400).json({ data: err.message }); }
                                    try {
                                        rows[0].password = JSON.stringify(hashedPassword)
                                        db.User.items.upsert(rows[0]);
                                        res.json({ data: rows[0] })
                                    } catch (err) {
                                        res.status(400).json({ data: err.message })
                                    }
                                });

                        }
                    }
                }

            } else {
                throw `Table ${table} not defined.`
            }
        } catch (err) {
            res.status(400).json({ data: err.message })
        }
    });

/**
 * delete an item
 *  @table - name of the table 
 *  @id - id from the item 
 */
router.post('/delete/:table/:id',
    async (req, res) => {
        const table = req.params.table;
        const item_id = req.params.id;
        try {
            if (!table || !item_id) { throw "Table or ID missing." }
            if (table && table == 'user') {

                await db.User.item(item_id, item_id).delete();
                res.json({ data: [] })

            }
            else if (table && table == 'protocol') {

                await db.Protocol.item(item_id, item_id).delete();
                res.json({ data: [] })

            } else {
                throw "Table or ID not found."
            }
        } catch (err) {
            res.status(400).json({ data: err.message })
        }

    });

module.exports = router;