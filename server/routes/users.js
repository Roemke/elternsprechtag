// routes/users.js
const express = require("express");
const router = express.Router();
const db = require("../db/database");
const bcrypt = require("bcrypt");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const upload = multer({ storage: multer.memoryStorage() });
const jwt = require("jsonwebtoken");
const {
  authMiddleware,
  adminMiddleware,
  globalAdminMiddleware,
} = require("../middleware/auth");
const { generateSlots } = require('./slots')

// Alle Lehrer einer Schule abrufen
router.get("/school/:school_id", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, first_name, last_name, email, role FROM users WHERE school_id = ?",
      [req.params.school_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lehrer anlegen (durch Schuladmin)
router.post("/", adminMiddleware, async (req, res) => {
  try {
    const { school_id, first_name, last_name, email, role } = req.body;

    //passwort generieren: schulname + aktuelles jahr
    const [schoolRows] = await db.query(
      "SELECT name FROM schools WHERE id = ?",
      [school_id],
    );
    const schoolName = schoolRows[0]?.name.replace(/\s+/g, "-");
    const year = new Date().getFullYear();
    const password = `${schoolName}-${year}`;
    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (school_id, first_name,last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?) ",
      [school_id, first_name, last_name, email, password_hash, role],
    );

    // Lehrer zu aktiven Events der Schule hinzufügen
    const [activeEvents] = await db.query(
      'SELECT id, time_start, time_end, slot_duration FROM events WHERE school_id = ? AND active = 1',
      [school_id]
    )
    for (const event of activeEvents) {
      await db.query(
        'INSERT INTO teacher_events (teacher_id, event_id, time_start, time_end, active) VALUES (?, ?, ?, ?, 1)',
        [result.insertId, event.id, event.time_start, event.time_end]
      )
      const count = await generateSlots(result.insertId, event.time_start, event.time_end, event.slot_duration)
      console.log(`Slots für Lehrer ${first_name} ${last_name} und Event ${event.id} generiert: ${count}`)
    }
    
    // Passwort im Klartext zurückgeben damit es per Email verschickt werden kann
    res.json({
      id: result.insertId,
      first_name,
      last_name,
      email,
      role,
      password,
    });
  } catch (err) {    
    console.error('Fehler:', err.message)
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
    // JWT Token generieren
    const token = jwt.sign(
      { id: user.id, role: user.role, school_id: user.school_id },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );
    res.json({ ...user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Passwort ändern
router.put("/:id/password", authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id) &&
        req.user.role !== 'global_admin' &&
        req.user.role !== 'school_admin') {
      return res.status(403).json({ error: 'Keine Berechtigung' })
    }
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
router.get("/all", globalAdminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, school_id, first_name, last_name, email, role FROM users",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher Events eines Lehrers abrufen
router.get('/:id/teacherevents', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT te.id, te.event_id, te.time_start, te.time_end, te.active,
        e.name as event_name, e.date
       FROM teacher_events te
       JOIN events e ON te.event_id = e.id
       WHERE te.teacher_id = ?
       ORDER BY e.date DESC`,
      [req.params.id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// User löschen
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    // teacher_events des Users holen
    const [teacherEvents] = await db.query(
      'SELECT id FROM teacher_events WHERE teacher_id = ?', [req.params.id]
    )
    for (const te of teacherEvents) {
      await db.query('DELETE FROM bookings WHERE slot_id IN (SELECT id FROM slots WHERE teacher_event_id = ?)', [te.id])
      await db.query('DELETE FROM slots WHERE teacher_event_id = ?', [te.id])
    }
    await db.query('DELETE FROM teacher_events WHERE teacher_id = ?', [req.params.id])
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// User aktualisieren
router.put("/:id", adminMiddleware, async (req, res) => {
  try {
    const { first_name, last_name, email, role, school_id, newPassword } =
      req.body;
    if (newPassword) {
      const password_hash = await bcrypt.hash(newPassword, 10);
      await db.query(
        'UPDATE users SET first_name = ?, last_name = ?, email = ?, role = ?, school_id = ?, password_hash = ?, auth_method = ? WHERE id = ?',
        [first_name, last_name, email, role, school_id, password_hash, auth_method || 'internal', req.params.id]
      );        
    } else {
      await db.query(
        'UPDATE users SET first_name = ?, last_name = ?, email = ?, role = ?, school_id = ?, auth_method = ? WHERE id = ?',
        [first_name, last_name, email, role, school_id, auth_method || 'internal', req.params.id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//profil bearbeiten (nur sich selbst, auch Lehrer)
router.put('/:id/profile', authMiddleware, async (req, res) => {
  try {
    // nur sich selbst bearbeiten
    if (req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Keine Berechtigung' })
    }
    const { first_name, last_name, auth_method } = req.body
    await db.query(
      'UPDATE users SET first_name = ?, last_name = ?, auth_method = ? WHERE id = ?',
      [first_name, last_name, auth_method || 'internal', req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post(
  "/import",
  adminMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const school_id = req.body.school_id;
      const sendEmail = req.body.sendEmail === "true";

      const records = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: [",", ";"],
      });

      const passwords = [];

      for (const record of records) {
        const { name, vorname, email, rolle } = record;

        // Schulname für Passwort holen
        const [schoolRows] = await db.query(
          "SELECT name FROM schools WHERE id = ?",
          [school_id],
        );
        const schoolName = schoolRows[0]?.name.replace(/\s+/g, "-");
        const year = new Date().getFullYear();
        const password = `${schoolName}-${year}`;
        const password_hash = await bcrypt.hash(password, 10);

        await db.query(
          "INSERT INTO users (school_id, first_name,last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)",
          [school_id, vorname, name, email, password_hash, rolle || "teacher"],
        );

        passwords.push({
          last_name: name,
          first_name: vorname,
          email,
          password,
        });
        // Lehrer zu aktiven Events der Schule hinzufügen
        const [activeEvents] = await db.query(
          'SELECT id, time_start, time_end , slot_durationFROM events WHERE school_id = ? AND active = 1',
          [school_id]
        )
        for (const event of activeEvents) {
          await db.query(
            'INSERT INTO teacher_events (teacher_id, event_id, time_start, time_end, active) VALUES (?, ?, ?, ?, 1)',
            [result.insertId, event.id, event.time_start, event.time_end]
          )
          await generateSlots(result.insertId, event.time_start, event.time_end, event.slot_duration)
        }
      }

      res.json({ success: true, passwords });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);
module.exports = router;
