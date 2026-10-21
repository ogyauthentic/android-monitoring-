const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'monitor.db');

function openDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

async function init() {
  const db = await openDb();

  await new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event TEXT,
          packageName TEXT,
          device TEXT,
          timestamp TEXT,
          payload TEXT
        )
      `, (err) => {
        if (err) return reject(err);

        db.run(`
          CREATE TABLE IF NOT EXISTS screenshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path TEXT,
            file_name TEXT,
            device TEXT,
            created_at TEXT,
            source TEXT
          )
        `, (err2) => {
          if (err2) return reject(err2);
          resolve();
        });
      });
    });
  });

  db.close();
}

async function insertLog(record) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO logs (event, packageName, device, timestamp, payload)
       VALUES (?, ?, ?, ?, ?)`,
      [
        record.event || null,
        record.packageName || null,
        record.device || null,
        record.timestamp || new Date().toISOString(),
        JSON.stringify(record)
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
  db.close();
}

async function insertScreenshot(metadata) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO screenshots (file_path, file_name, device, created_at, source)
       VALUES (?, ?, ?, ?, ?)`,
      [
        metadata.file_path || null,
        metadata.file_name || null,
        metadata.device || null,
        metadata.created_at || new Date().toISOString(),
        metadata.source || null
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
  db.close();
}

async function getLogs() {
  const db = await openDb();
  const rows = await new Promise((resolve, reject) => {
    db.all('SELECT * FROM logs ORDER BY id DESC LIMIT 200', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  db.close();
  return rows;
}

module.exports = {
  init,
  insertLog,
  insertScreenshot,
  getLogs
};
