// Elternsprechtag - (c) Roemke - MIT License
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
const io = new Server(server);

app.use(express.json());

// Test-Route
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Elternsprechtag API läuft' });
});

//weitere Routen
const schoolsRouter = require('./routes/schools');
app.use('/api/schools', schoolsRouter);


// WebSocket Verbindung
io.on('connection', (socket) => {
    console.log('Client verbunden:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client getrennt:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
