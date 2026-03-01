// Elternsprechtag - (c) Roemke - MIT License
require('dotenv').config()
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const db = require('./db/database');


// DB Verbindung testen
db.getConnection()
    .then(() => console.log('Datenbankverbindung OK'))
    .catch(err => console.error('Datenbankfehler:', err));

const app = express();
const server = http.createServer(app);

const { initSocket } = require('./socket')
const io = initSocket(server)

app.use(express.json());

// Test-Route
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Elternsprechtag API läuft' });
});

//weitere Routen
const schoolsRouter = require('./routes/schools');
app.use('/api/schools', schoolsRouter);

const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

//routen für events
const eventsRouter = require('./routes/events');
app.use('/api/events', eventsRouter);

//routen für slots
const { router: slotsRouter, generateSlots } = require('./routes/slots')
app.use('/api/slots', slotsRouter);

const bookingsRouter = require('./routes/bookings');
app.use('/api/bookings', bookingsRouter);

//websocket für Echtzeit-Updates bei Buchungen, ggf. anderem

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});

module.exports = { io }
