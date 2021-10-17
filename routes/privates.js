var express = require('express');
var crypto = require('crypto');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
var db = require('../src/db');
const { TITLE } = require('../config.js');

var router = express.Router();

router.get('/home',
    async (req, res, next) => {
        res.render('home', {
            title: TITLE,
            me: req.user
        });
    });

router.get('/me',
    async (req, res, next) => {
        res.render('me', { title: TITLE });
    });

router.get('/data/:table',
    async (req, res, next) => {
        const table = req.params.table;

        if (table && table == 'user') {
            const { resources: rows } = await db.User.items
                .query(`SELECT * FROM c`)
                .fetchAll();
            if (rows) {
                res.json({ data: rows })
            }
        }
        else if (table && table == 'protocol') {
            const { resources: rows } = await db.Protocol.items
                .query(`SELECT * FROM c`)
                .fetchAll();
            if (rows) {
                res.json({ data: rows })
            }
        } else {
            res.json({ data: [] })
        }
    });

module.exports = router;