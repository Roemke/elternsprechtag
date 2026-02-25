// Elternsprechtag - (c) Roemke - MIT License
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// Test-Route
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Elternsprechtag API läuft' });
});

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
