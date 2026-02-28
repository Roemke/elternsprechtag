// routes/slots.js
const express = require('express')
const router = express.Router()
const db = require('../db/database')
const { authMiddleware, adminMiddleware, globalAdminMiddleware } = require('../middleware/auth')


// Slots für einen teacher_event generieren
async function generateSlots(teacher_event_id, time_start, time_end, slot_duration) {
  
  console.log('generateSlots:', teacher_event_id, time_start, time_end, slot_duration)
  // Bestehende Slots löschen
  await db.query('DELETE FROM slots WHERE teacher_event_id = ?', [teacher_event_id])

  const slots = []
  const [startHour, startMin] = time_start.split(':').map(Number)
  const [endHour, endMin] = time_end.split(':').map(Number)
  console.log('start:', startHour, startMin, 'end:', endHour, endMin)
  let current = startHour * 60 + startMin
  const end = endHour * 60 + endMin

  while (current + slot_duration <= end) {
    const slotStart = `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`
    const slotEnd = `${String(Math.floor((current + slot_duration) / 60)).padStart(2, '0')}:${String((current + slot_duration) % 60).padStart(2, '0')}`
    slots.push([teacher_event_id, slotStart, slotEnd])
    current += slot_duration
  }

  for (const slot of slots) {
    await db.query(
      'INSERT INTO slots (teacher_event_id, start_time, end_time) VALUES (?, ?, ?)',
      slot
    )
  }

  return slots.length
}

// Slots für ein ganzes Event generieren
router.post('/generate/:event_id', adminMiddleware, async (req, res) => {
  try {
    const [teacherEvents] = await db.query(
      'SELECT te.*, e.slot_duration FROM teacher_events te JOIN events e ON te.event_id = e.id WHERE te.event_id = ?',
      [req.params.event_id]
    )

    let total = 0
    for (const te of teacherEvents) {
      const count = await generateSlots(te.id, te.time_start, te.time_end, te.slot_duration)
      total += count
    }

    res.json({ success: true, total })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Slots für einen einzelnen Lehrer neu generieren
router.post('/generate/:event_id/teacher/:teacher_id', adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT te.*, e.slot_duration FROM teacher_events te JOIN events e ON te.event_id = e.id WHERE te.event_id = ? AND te.teacher_id = ?',
      [req.params.event_id, req.params.teacher_id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Nicht gefunden' })

    const te = rows[0]
    const count = await generateSlots(te.id, te.time_start, te.time_end, te.slot_duration)

    res.json({ success: true, count })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Slots eines Lehrers für ein Event abrufen - keine Middleware, wird auch von Eltern aufgerufen
router.get('/:event_id/teacher/:teacher_id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, b.parent_name, b.child_name, b.cookie_id 
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

module.exports = {router, generateSlots}
