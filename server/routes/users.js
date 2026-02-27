// routes/users.js
const express = require("express");
const router = express.Router();
const db = require("../db/database");
const bcrypt = require("bcrypt");

// Alle Lehrer einer Schule abrufen
router.get("/school/:school_id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, role FROM users WHERE school_id = ?",
      [req.params.school_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lehrer anlegen (durch Schuladmin)
router.post("/", async (req, res) => {
  try {
    const { school_id, name, email, role } = req.body;

    //passwort generieren: schulname + aktuelles jahr
    const [schoolRows] = await db.query('SELECT name FROM schools WHERE id = ?', [school_id])
    const schoolName = schoolRows[0]?.name.replace(/\s+/g, '-')
    const year = new Date().getFullYear()
    const password = `${schoolName}-${year}`    
    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (school_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [school_id, name, email, password_hash, role],
    );

    // Passwort im Klartext zurückgeben damit es per Email verschickt werden kann
    res.json({ id: result.insertId, name, email, role, password });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ error: "Email oder Passwort falsch" });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Email oder Passwort falsch" });
    }

    // Passwort nicht zurückgeben
    delete user.password_hash;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Passwort ändern
router.put("/:id/password", async (req, res) => {
  try {
    const { password } = req.body;
    const password_hash = await bcrypt.hash(password, 10);

    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      password_hash,
      req.params.id,
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alle User für globalen Admin
router.get("/all", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, school_id, name, email, role FROM users",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User löschen
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, role, school_id, newPassword } = req.body
    if (newPassword) {
      const password_hash = await bcrypt.hash(newPassword, 10)
      await db.query(
        'UPDATE users SET name = ?, email = ?, role = ?, school_id = ?, password_hash = ? WHERE id = ?',
        [name, email, role, school_id, password_hash, req.params.id]
      )
    } else {
      await db.query(
        'UPDATE users SET name = ?, email = ?, role = ?, school_id = ? WHERE id = ?',
        [name, email, role, school_id, req.params.id]
      )
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router;
