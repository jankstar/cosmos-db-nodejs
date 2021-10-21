var express = require('express');
var avatarePath = require("path").join(__dirname, "../static/avatare");
var fs = require("fs");
var crypto = require('crypto');
var db = require('../src/db');
const { TITLE } = require('../config.js');

var router = express.Router();

/**
 * delete all underline property and password ans salt
 * @param {array of items} rows 
 * @returns {array of items} rows
 */
function cleanUp(rows) {
    if (rows) {
        rows.forEach((item) => {
            //delete all underline properties
            // and salt and password
            for (fieldname in item) {
                if (fieldname == '_ts') {
                    var myDate = new Date(item[fieldname] * 1000)
                    item.modified = myDate.toISOString();
                }
                if (fieldname.substring(0, 1) == '_' || fieldname == 'salt' || fieldname == 'password') {
                    delete item[fieldname];
                }
            }
        });
    }
    return rows;
}

router.get('/home',
    async (req, res) => {
        res.render('home', {
            title: TITLE
        });
    });

router.get('/me',
    async (req, res) => {
        res.render('me', {
            title: TITLE
        });
    });

router.get('/data/:table',
    async (req, res) => {
        const table = req.params.table;
        var limit = req.query.limit || '50';
        var offsent = req.query.offset || '0';
        var qWhere = req.query.q || '';
        try {
            if (qWhere) {
                if (qWhere == '*') { qWhere = '' } else {
                    var aWhere = qWhere.split(':');
                    if (aWhere || aWhere.length() == 2) {
                        //var aStr = aWhere[1].replace(/\*/g, '');
                        qWhere = `WHERE CONTAINS(c.${aWhere[0]}, '${aWhere[1].replace(/\*/g, '')}')`;
                    }
                }
            }

            if (table && table == 'me') {
                if (!req.user.id) { throw "User ID not valide." }
                const { resource: user } = await db.User.item(req.user.id, req.user.id).read();
                var tsDate = new Date(user._ts * 1000)
                var lUser = {
                    "id": user.id,
                    "username": user.username,
                    "password": user.password,
                    "avatar": user.avatar || "",
                    "role": user.role || "new",
                    "modified": tsDate.toISOString(),
                }
                res.json({ data: lUser });
            } else if (table && table == 'avatare') {
                var avatarList = [];
                var fileListe = fs.readdirSync(avatarePath);
                fileListe.forEach(function (file) {
                    avatarList.push('/static/avatare/' + file);
                });
                res.json({ data: avatarList });
            }
            else if (table && table == 'user') {
                var { resources: rows } = await db.User.items
                    .query(`SELECT * FROM c ${qWhere} OFFSET ${offsent} LIMIT ${limit}`)
                    .fetchAll();
                rows = rows || []
                rows = cleanUp(rows);
                res.json({ data: rows });

            }
            else if (table && table == 'protocol') {
                var { resources: rows } = await db.Protocol.items
                    .query(`SELECT * FROM c ${qWhere} OFFSET ${offsent} LIMIT ${limit}`)
                    .fetchAll();
                rows = rows || []
                rows = cleanUp(rows);
                res.json({ data: rows });
            } else {
                res.json({ data: [] });
            }
        } catch (err) {
            res.status(400).json({ data: err.message })
        }
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
            if (table && table == 'me') {
                if (req.body.id && req.user.id && req.body.id == req.user.id) {

                    //change me as user
                    const { resource: user } = await db.User.item(req.body.id, req.body.id).read();
                    if (!user) { throw `User ID ${req.body.id} not found` }
                    user.username = req.body.username || user.username;
                    user.avatar = req.body.avatar || user.avatar;
                    db.User.items.upsert(user);
                    res.json({ data: 'Updated data.' });

                } else if ((req.body.password_old && req.body.password_new && req.body.password_new2
                    && req.body.password_new == req.body.password_new2)) {

                    //change Password as me
                    const { resource: user } = await db.User.item(req.user.id, req.user.id).read();
                    if (!user) { throw `User ID not found.` }

                    var salt = Buffer.from(JSON.parse(user.salt));

                    crypto.pbkdf2(req.body.password_old, salt, 310000, 32, 'sha256',
                        function (err, hashedPassword) {
                            if (err) { return res.status(400).json({ data: err.message }); }

                            var password = Buffer.from(JSON.parse(user.password));
                            if (!crypto.timingSafeEqual(password, hashedPassword)) {
                                return res.status(400).json({ data: 'Incorrect username or password.' });
                            }

                            //set new password als hash
                            crypto.pbkdf2(req.body.password_new, salt, 310000, 32, 'sha256',
                                async (err, hashedPasswordNew) => {
                                    if (err) { return res.status(400).json({ data: err.message }); }

                                    user.password = JSON.stringify(hashedPasswordNew)
                                    try {
                                        db.User.items.upsert(user);
                                        res.json({ data: 'Updated password.' })
                                    } catch (err) {
                                        res.status(400).json({ data: err.message });
                                    }
                                });
                        });
                }
            } else {
                throw `Table ${table} not defined.`
            }
        } catch (err) {
            res.status(400).json({ data: err.message })
        }
    });


module.exports = router;