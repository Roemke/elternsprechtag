// routes/events.js
const express = require("express");
const router = express.Router();
const db = require("../db/database");
const { authMiddleware, adminMiddleware, globalAdminMiddleware } = require('../middleware/auth')

// Alle Events abrufen
router.get("/", globalAdminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM events ORDER BY date DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//events anhand der Schule
router.get("/school/:school_id", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM events WHERE school_id = ? ORDER BY date DESC",
      [req.params.school_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Event anlegen + automatisch alle Lehrer zuweisen
router.post("/", adminMiddleware, async (req, res) => {
  try {
    //console.log('Event anlegen:', req.body)
    const {
      school_id,
      name,
      date,
      time_start,
      time_end,
      slot_duration,
      active,
    } = req.body;

    const [result] = await db.query(
      "INSERT INTO events (school_id, name, date, time_start, time_end, slot_duration, active) VALUES (?, ?, ?, ?, ?, ?, 1)",
      [
        school_id,
        name,
        date,
        time_start,
        time_end,
        slot_duration || 15,
        active ?? true,
      ],
    );
    const event_id = result.insertId;

    // Alle Lehrer der Schule automatisch zuweisen
    const [teachers] = await db.query(
      'SELECT id FROM users WHERE school_id = ? AND role IN ("teacher", "school_admin")',
      [school_id],
    );

    for (const teacher of teachers) {
      await db.query(
        "INSERT INTO teacher_events (teacher_id, event_id, time_start, time_end, active) VALUES (?, ?, ?, ?, 1)",
        [teacher.id, event_id, time_start, time_end],
      );
    }

    res.json({ id: event_id });
  } catch (err) {
    console.error("Fehler:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Event bearbeiten
router.put("/:id", adminMiddleware, async (req, res) => {
  try {
    const {
      name,
      date,
      time_start,
      time_end,
      slot_duration,
      active,
      timesChanged,
    } = req.body;
    await db.query(
      "UPDATE events SET name = ?, date = ?, time_start = ?, time_end = ?, slot_duration = ?, active = ? WHERE id = ?",
      [name, date, time_start, time_end, slot_duration, active, req.params.id],
    );

    // teacher_events Zeiten aktualisieren – aber nur wenn der Lehrer noch den Standard-Zeitrahmen hat
    // d.h. wenn time_start und time_end des teacher_event mit dem alten Event-Zeitrahmen übereinstimmen
    // Einfachste Lösung: alle teacher_events aktualisieren
    if (timesChanged) {
      await db.query(
        "UPDATE teacher_events SET time_start = ?, time_end = ? WHERE event_id = ?",
        [time_start, time_end, req.params.id],
      );
      // Alle Slots des Events löschen
      const [teacherEvents] = await db.query(
        "SELECT id FROM teacher_events WHERE event_id = ?",
        [req.params.id],
      );
      for (const te of teacherEvents) {
        await db.query("DELETE FROM slots WHERE teacher_event_id = ?", [te.id]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Fehler:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Event löschen
router.delete("/:id", adminMiddleware, async (req, res) => {
  try {
    const [teacherEvents] = await db.query(
      "SELECT id FROM teacher_events WHERE event_id = ?",
      [req.params.id],
    );
    //aufwändiger, ginge mit einer cascade FK Beziehung,
    // aber das war mir zu gefährlich, naja...
    for (const te of teacherEvents) {
      await db.query(
        "DELETE FROM bookings WHERE slot_id IN (SELECT id FROM slots WHERE teacher_event_id = ?)",
        [te.id],
      );
      await db.query(
        "DELETE FROM waitlist WHERE slot_id IN (SELECT id FROM slots WHERE teacher_event_id = ?)",
        [te.id],
      );
      await db.query("DELETE FROM slots WHERE teacher_event_id = ?", [te.id]);
    }
    await db.query("DELETE FROM teacher_events WHERE event_id = ?", [
      req.params.id,
    ]);
    await db.query("DELETE FROM events WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lehrer-Zeitrahmen oder active Flag anpassen
router.put("/:id/teacher/:teacher_id", adminMiddleware, async (req, res) => {
  try {
    const { time_start, time_end, active } = req.body;
    console.log('Event bearbeiten:', req.body)
    await db.query(
      "UPDATE teacher_events SET time_start = ?, time_end = ?, active = ? WHERE event_id = ? AND teacher_id = ?",
      [time_start, time_end, active, req.params.id, req.params.teacher_id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lehrer eines Events abrufen, für Eltern in bookings.js
router.get("/:id/teachers", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT te.*, u.first_name, u.last_name 
       FROM teacher_events te 
       JOIN users u ON te.teacher_id = u.id 
       WHERE te.event_id = ?
       ORDER BY u.last_name, u.first_name`,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
