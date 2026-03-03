// routes/events.js
const express = require("express");
const router = express.Router();
const db = require("../db/database");
const { getIo } = require("../socket");
const {
  authMiddleware,
  adminMiddleware,
  globalAdminMiddleware,
} = require("../middleware/auth");

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
      const [te] = await db.query(
        "INSERT INTO teacher_events (teacher_id, event_id, time_start, time_end, active) VALUES (?, ?, ?, ?, 1)",
        [teacher.id, event_id, time_start, time_end],
      );
      await generateSlots(
        te.insertId,
        time_start,
        time_end,
        slot_duration || 15,
      );
    }
    res.json({ id: event_id });
  } catch (err) {
    console.error("Fehler:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Hilfsfunktion zum berechnen von Minuten aus einem Zeitstring
function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
// Event bearbeiten - admin, das nochmal anschauen
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
    console.log("teacher update:", req.body);
    console.log("timesChanged:", timesChanged, "active:", active);
    //Frage die Zeiten ab, wenn sie kürzer sind müssen die Slots gelöscht und neu generiert werden,
    // wenn sie länger sind, können die Slots bleiben, es sei denn sie überschneiden sich mit den neuen Zeiten,
    // das wäre dann ein Problem, aber das lasse ich erstmal außen vor, da es eher
    // dass dieser fall auftritt.
    const [[oldEvent]] = await db.query(
      "SELECT time_start, time_end FROM events WHERE id = ?",
      [req.params.id],
    ); //zweifache destrukturieren, damit ich die alten Zeiten habe, um zu vergleichen, ob sie sich geändert haben und ob die Slots gelöscht werden müssen.

    await db.query(
      "UPDATE events SET name = ?, date = ?, time_start = ?, time_end = ?, slot_duration = ?, active = ? WHERE id = ?",
      [name, date, time_start, time_end, slot_duration, active, req.params.id],
    );

    // teacher_events Zeiten aktualisieren – aber nur wenn der Lehrer noch den Standard-Zeitrahmen hat
    // d.h. wenn time_start und time_end des teacher_event mit dem alten Event-Zeitrahmen übereinstimmen
    // Einfachste Lösung: alle teacher_events aktualisieren
    if (timesChanged || !active) {
      await db.query(
        "UPDATE teacher_events SET time_start = ?, time_end = ? WHERE event_id = ?",
        [time_start, time_end, req.params.id],
      );

      if (time_start > oldEvent.time_start || time_end < oldEvent.time_end) {
        const [teacherEvents] = await db.query(
          "SELECT id FROM teacher_events WHERE event_id = ?",
          [req.params.id],
        );
        for (const te of teacherEvents) {
          await db.query("DELETE FROM slots WHERE teacher_event_id = ?", [
            te.id,
          ]);
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Fehler:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// Lehrer-Zeitrahmen oder active Flag anpassen
//req.params.id ist die event_id, req.params.teacher_id ist die teacher_id
router.put("/:id/teacher/:teacher_id", authMiddleware, async (req, res) => {
  console.log(
    "call to router.put /:id/teacher/:teacher_id with event_id:",
    req.params.id,
    "teacher_id:",
    req.params.teacher_id,
    "body:",
    req.body,
  );
  try {
    // Lehrer darf nur seine eigenen Zeiten ändern, Admins alles
    if (
      req.user.id !== parseInt(req.params.teacher_id) &&
      req.user.role !== "global_admin" &&
      req.user.role !== "school_admin"
    ) {
      return res.status(403).json({ error: "Keine Berechtigung" });
    }
    const { time_start, time_end, active } = req.body;
    console.log("teacher update:", req.body);
    //Frage die Zeiten ab, wenn sie kürzer sind müssen die Slots gelöscht und neu generiert werden,
    // wenn sie länger sind, können die Slots bleiben, es sei denn sie überschneiden sich mit den neuen Zeiten,
    // problem - in diesem Fall müsste ich die slots manuell setzen
    // das wäre dann ein Problem, aber das lasse ich erstmal außen vor, da es eher
    // unwahrscheinlich ist, dass ein Lehrer spontan seine Zeiten verlängert :-)

    const [[oldTeacherEvent]] = await db.query(
      "SELECT id,time_start, time_end FROM teacher_events WHERE teacher_id = ? AND event_id = ?",
      [req.params.teacher_id, req.params.id],
    ); //zweifache Destrukturieren
    console.log("oldTeacherEvent:", oldTeacherEvent);
    await db.query(
      "UPDATE teacher_events SET time_start = ?, time_end = ?, active = ? WHERE id = ? ",
      [time_start, time_end, active, oldTeacherEvent.id],
    );
    // teacher_events Zeiten aktualisieren
    // wenn der Zeitrange kleiner wird müssen die slots gelöscht und neu generiert werden, wenn er größer wird, können die bestehenden Slots bleiben, da sie ja weiterhin gültig sind, außer sie überschneiden sich mit den neuen Zeiten, aber das lasse ich erstmal außen vor, da es eher unwahrscheinlich ist, dass ein Lehrer spontan seine Zeiten verlängert :-)
    const [[slotDuration]] = await db.query(
      "SELECT slot_duration FROM events WHERE id = ?",
      [req.params.id],
    );
    if (
      toMinutes(time_start) > toMinutes(oldTeacherEvent.time_start) ||
      toMinutes(time_end) < toMinutes(oldTeacherEvent.time_end)
    ) {
      // Alle Slots des Events für den Lehrer löschen
      console.log(
        "call to generateSlots with oldTeacherEvent.id:",
        oldTeacherEvent.id,
        "time_start:",
        time_start,
        "time_end:",
        time_end,
      );

      //generateSlots should delete all slots and inform the clients about the new slots,
      // so they can update their state accordingly, instead of just deleting all slots and letting the clients handle it, which would be more complex and error-prone, especially if there are already bookings for some of the slots. Also, generateSlots will create the new slots based on the new time range,
      // so we don't have to worry about overlapping or invalid slots.
      await generateSlots(
        oldTeacherEvent.id,
        time_start,
        time_end,
        slotDuration.slot_duration,
      );
    } else {
      console.log(
        "call to extendSlots with oldTeacherEvent.id:",
        oldTeacherEvent.id,
        "time_start:",
        time_start,
        "time_end:",
        time_end,
        "slot_duration:",
        slotDuration.slot_duration,
      );
      await extendSlots(
        oldTeacherEvent.id,
        time_start,
        time_end,
        slotDuration.slot_duration,
      );
    }
    res.json({ success: true });
  } catch (err) {
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

//Hilfsfunktionen für die Slots

// Slots für einen teacher_event generieren
async function generateSlots(
  teacher_event_id,
  time_start,
  time_end,
  slot_duration,
) {
  console.log(
    "generateSlots:",
    teacher_event_id,
    time_start,
    time_end,
    slot_duration,
  );
  // Bestehende Slots löschen
  await db.query(
    "DELETE FROM bookings WHERE slot_id IN (SELECT id FROM slots WHERE teacher_event_id = ?)",
    [teacher_event_id],
  );
  await db.query("DELETE FROM slots WHERE teacher_event_id = ?", [
    teacher_event_id,
  ]);
  const [eventRows] = await db.query(
    "SELECT event_id FROM teacher_events WHERE id = ?",
    [teacher_event_id],
  );
  if (eventRows.length === 0) {
    throw new Error("Teacher event not found");
  }
  const eventId = eventRows[0].event_id;

  const slots = [];
  const [startHour, startMin] = time_start.split(":").map(Number);
  const [endHour, endMin] = time_end.split(":").map(Number);
  console.log("start:", startHour, startMin, "end:", endHour, endMin);
  let current = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

  while (current + slot_duration <= end) {
    const slotStart = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`;
    const slotEnd = `${String(Math.floor((current + slot_duration) / 60)).padStart(2, "0")}:${String((current + slot_duration) % 60).padStart(2, "0")}`;
    slots.push([teacher_event_id, slotStart, slotEnd]);
    current += slot_duration;
  }

  for (const slot of slots) {
    await db.query(
      "INSERT INTO slots (teacher_event_id, start_time, end_time) VALUES (?, ?, ?)",
      slot,
    );
  }

  // Informiere alle verbundenen Clients über die neuen Slots
  getIo().to(`event-${eventId}`).emit("slots-generated", { teacher_event_id }); //name des members wird mit übertragen

  return slots.length;
}
//slots eines lehrers erweitern
async function extendSlots(
  teacher_event_id,
  new_time_start,
  new_time_end,
  slot_duration,
) {
  console.log(
    "extendSlots:",
    teacher_event_id,
    new_time_start,
    new_time_end,
    slot_duration,
  );
  const [eventRows] = await db.query(
    "SELECT event_id FROM teacher_events WHERE id = ?",
    [teacher_event_id],
  );
  if (eventRows.length === 0) {
    throw new Error("Teacher event not found");
  }
  //vorhandene Slots holen, nur die neuen hinzufügen, die außerhalb der alten Zeiten liegen
  const [slotRows] = await db.query(
    "SELECT start_time, end_time FROM slots WHERE teacher_event_id = ?",
    [teacher_event_id],
  );
  const existingSlots = slotRows.map((row) => ({
    start: row.start_time.substring(0, 5), //nur Stunden und Minuten, Sekunden weglassen
    end: row.end_time.substring(0, 5),
  }));
  const slots = [];
  const [startHour, startMin] = new_time_start.split(":").map(Number);
  const [endHour, endMin] = new_time_end.split(":").map(Number);
  console.log("new start:", startHour, startMin, "new end:", endHour, endMin);
  let current = startHour * 60 + startMin;
  const newEnd = endHour * 60 + endMin;

  while (current + slot_duration <= newEnd) {
    //strings in Zeiten aus Minuten berechnen
    const slotStart = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`;
    const slotEnd = `${String(Math.floor((current + slot_duration) / 60)).padStart(2, "0")}:${String((current + slot_duration) % 60).padStart(2, "0")}`;
    //nur hinzufügen, wenn es keinen bestehenden Slot gibt, der sich mit diesem überschneidet
    if (!existingSlots.some((s) => slotStart < s.end && slotEnd > s.start)) {
      slots.push([teacher_event_id, slotStart, slotEnd]);
    }
    current += slot_duration;
  }

  for (const slot of slots) {
    await db.query(
      "INSERT INTO slots (teacher_event_id, start_time, end_time) VALUES (?, ?, ?)",
      slot,
    );
  }

  // Informiere alle verbundenen Clients über die neuen Slots
  const eventId = eventRows[0].event_id;
  getIo().to(`event-${eventId}`).emit("slots-extended", { teacher_event_id });
}

module.exports = { router, generateSlots, extendSlots };
