const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const PORT = process.env.PORT || 3000;
const LOG_FILE = path.join(__dirname, 'logs.json');
const API_TOKEN = process.env.API_TOKEN || null;

let logs = [];

try {
  if (fs.existsSync(LOG_FILE)) {
    const raw = fs.readFileSync(LOG_FILE, 'utf8');
    logs = JSON.parse(raw);
  }
} catch (error) {
  console.log('No existing log file found, starting fresh.');
}

function saveLogs() {
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'server-running' });
});

app.get('/api/logs', (req, res) => {
  res.json(logs);
});

app.post('/api/log', (req, res) => {
  const authHeader = req.headers.authorization || '';

  if (API_TOKEN && authHeader !== `Bearer ${API_TOKEN}`) {
    return res.status(401).json({ ok: false, message: 'unauthorized' });
  }

  const payload = req.body || {};

  const record = {
    ...payload,
    receivedAt: new Date().toISOString()
  };

  logs.unshift(record);
  if (logs.length > 500) {
    logs = logs.slice(0, 500);
  }

  saveLogs();
  io.emit('new-log', record);

  console.log('Received log:', record);
  return res.json({ ok: true, message: 'log diterima' });
});

io.on('connection', (socket) => {
  console.log('Client connected');
  socket.emit('history', logs);
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
