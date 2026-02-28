// routes/bookings.js
const express = require('express')
const router = express.Router()
const db = require('../db/database')

// Slots eines Lehrers für ein Event abrufen (öffentlich)
router.get('/event/:event_id/teacher/:teacher_id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.start_time, s.end_time,
        CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END as booked
       FROM slots s
       JOIN teacher_events te ON s.teacher_event_id = te.id
       LEFT JOIN bookings b ON s.id = b.slot_id
       WHERE te.event_id = ? AND te.teacher_id = ?
       ORDER BY s.start_time`,
      [req.params.event_id, req.params.teacher_id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Alle Lehrer eines aktiven Events abrufen (öffentlich)
router.get('/event/:event_id/teachers', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.first_name, u.last_name, te.active
       FROM teacher_events te
       JOIN users u ON te.teacher_id = u.id
       WHERE te.event_id = ?
       ORDER BY u.last_name, u.first_name`,
      [req.params.event_id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Aktive Events einer Schule abrufen (öffentlich)
router.get('/school/:school_id/events', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, date, time_start, time_end,  school_id
       FROM events
       WHERE school_id = ? AND active = 1
       ORDER BY date`,
      [req.params.school_id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Slot buchen
router.post('/', async (req, res) => {
  try {
    const { slot_id, cookie_id, parent_name, child_name } = req.body

    // Prüfen ob Slot noch frei
    const [existing] = await db.query(
      'SELECT id FROM bookings WHERE slot_id = ?', [slot_id]
    )
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Slot bereits gebucht' })
    }

    await db.query(
      'INSERT INTO bookings (slot_id, cookie_id, parent_name, child_name) VALUES (?, ?, ?, ?)',
      [slot_id, cookie_id, parent_name, child_name]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Buchung löschen (durch Eltern via Cookie)
router.delete('/:slot_id/cookie/:cookie_id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM bookings WHERE slot_id = ? AND cookie_id = ?',
      [req.params.slot_id, req.params.cookie_id]
    )
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'Nicht berechtigt' })
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Buchung löschen (durch Admin/Lehrer)
router.delete('/:slot_id', async (req, res) => {
  try {
    await db.query('DELETE FROM bookings WHERE slot_id = ?', [req.params.slot_id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Alle Buchungen eines Events (für Admin)
router.get('/event/:event_id/all', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.first_name, u.last_name, s.start_time, s.end_time,
        b.parent_name, b.child_name, b.id as booking_id, s.id as slot_id
       FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       JOIN teacher_events te ON s.teacher_event_id = te.id
       JOIN users u ON te.teacher_id = u.id
       WHERE te.event_id = ?
       ORDER BY u.last_name, u.first_name, s.start_time`,
      [req.params.event_id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Eigene Buchungen eines Lehrers
router.get('/teacher/:teacher_id/event/:event_id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.id as slot_id, s.start_time, s.end_time,
        b.parent_name, b.child_name, b.id as booking_id
       FROM slots s
       JOIN teacher_events te ON s.teacher_event_id = te.id
       LEFT JOIN bookings b ON s.id = b.slot_id
       WHERE te.teacher_id = ? AND te.event_id = ?
       ORDER BY s.start_time`,
      [req.params.teacher_id, req.params.event_id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

//bookings mit cookie_id abrufen, für Eltern, damit sie ihre Buchungen sehen und ggf. löschen können
router.get('/cookie/:cookie_id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.slot_id, s.start_time, s.end_time, te.event_id,
        CONCAT(u.last_name, ', ', u.first_name) as teacher,
        b.parent_name, b.child_name
       FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       JOIN teacher_events te ON s.teacher_event_id = te.id
       JOIN users u ON te.teacher_id = u.id
       WHERE b.cookie_id = ?
       ORDER BY s.start_time`,
      [req.params.cookie_id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
module.exports = router