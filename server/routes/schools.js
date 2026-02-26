// routes/schools.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Alle Schulen abrufen
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM schools');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Schule anlegen
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        const [result] = await db.query(
            'INSERT INTO schools (name) VALUES (?)',
            [name]
        );
        res.json({ id: result.insertId, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;