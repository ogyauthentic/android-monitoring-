const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const multer = require('multer');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN || null;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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

let lastFrame = null;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'server-running' });
});

app.get('/stream.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'stream.html'));
});

app.get('/api/logs', async (req, res) => {
  try {
    const logs = await db.getLogs();
    res.json(logs);
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch logs' });
  }
});

app.post('/api/log', async (req, res) => {
  const authHeader = req.headers.authorization || '';

  if (API_TOKEN && authHeader !== `Bearer ${API_TOKEN}`) {
    return res.status(401).json({ ok: false, message: 'unauthorized' });
  }

  const payload = req.body || {};
  const record = {
    ...payload,
    receivedAt: new Date().toISOString()
  };

  try {
    await db.insertLog(record);
    io.emit('new-log', record);
    return res.json({ ok: true, message: 'log diterima' });
  } catch (error) {
    console.error('Failed to save log:', error);
    return res.status(500).json({ ok: false, message: 'Failed to save log' });
  }
});

app.post('/api/screenshot', async (req, res) => {
  const authHeader = req.headers.authorization || '';

  if (API_TOKEN && authHeader !== `Bearer ${API_TOKEN}`) {
    return res.status(401).json({ ok: false, message: 'unauthorized' });
  }

  upload.single('file')(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ ok: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const metadata = {
      file_path: fileUrl,
      file_name: req.file.filename,
      device: req.body.device || 'unknown',
      source: req.body.source || 'app',
      created_at: new Date().toISOString()
    };

    try {
      await db.insertScreenshot(metadata);
      const record = {
        type: 'screenshot',
        fileUrl,
        uploadedAt: metadata.created_at,
        device: metadata.device,
        source: metadata.source
      };
      io.emit('new-log', record);
      return res.json({
        ok: true,
        message: 'screenshot uploaded',
        fileUrl,
        url: `${req.protocol}://${req.get('host')}${fileUrl}`
      });
    } catch (error) {
      console.error('Failed to save screenshot metadata:', error);
      return res.status(500).json({ ok: false, message: 'Failed to save screenshot' });
    }
  });
});

io.on('connection', (socket) => {
  console.log('Client connected');

  if (lastFrame) {
    socket.emit('screen-frame', { image: lastFrame });
  }

  socket.on('screen-frame', (payload) => {
    const { image } = payload || {};
    if (image) {
      lastFrame = image;
      io.emit('screen-frame', { image });
    }
  });
});

async function init() {
  try {
    await db.init();
    server.listen(PORT, () => {
      console.log(`Realtime screen server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Server failed to initialize DB:', error);
    process.exit(1);
  }
}

init();
