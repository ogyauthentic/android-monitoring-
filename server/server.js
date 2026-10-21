const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const multer = require('multer');

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
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WEBP are allowed'));
    }
    cb(null, true);
  }
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOAD_DIR));

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

app.post('/api/screenshot', (req, res) => {
  const authHeader = req.headers.authorization || '';

  if (API_TOKEN && authHeader !== `Bearer ${API_TOKEN}`) {
    return res.status(401).json({ ok: false, message: 'unauthorized' });
  }

  upload.single('file')(req, res, function (err) {
    if (err) {
      return res.status(400).json({ ok: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const record = {
      type: 'screenshot',
      fileUrl,
      uploadedAt: new Date().toISOString()
    };

    logs.unshift(record);
    if (logs.length > 500) {
      logs = logs.slice(0, 500);
    }

    saveLogs();
    io.emit('new-log', record);

    return res.json({
      ok: true,
      message: 'screenshot uploaded',
      fileUrl,
      url: `${req.protocol}://${req.get('host')}${fileUrl}`
    });
  });
});

io.on('connection', (socket) => {
  console.log('Client connected');
  socket.emit('history', logs);
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
