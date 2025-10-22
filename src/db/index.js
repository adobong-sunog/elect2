const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = process.env.DB_FILE || 'peppi.db';
const DB_PATH = path.join(DATA_DIR, DB_FILE);

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH, (error) => {
  if (error) {
    console.error('Failed to connect to SQLite database.', error);
  }
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function handler(error) {
      if (error) {
        reject(error);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
      } else {
        resolve(row);
      }
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });
}

async function init() {
  await run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'leader',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      leader_names TEXT NOT NULL,
      leader_email TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      venue TEXT NOT NULL,
      nurtures TEXT NOT NULL,
      aims TEXT NOT NULL,
      impact_summary TEXT NOT NULL,
      primary_beneficiaries TEXT NOT NULL,
      secondary_beneficiaries TEXT NOT NULL,
      secondary_beneficiaries_count INTEGER NOT NULL CHECK (secondary_beneficiaries_count >= 0),
      attendance_path TEXT,
      attendance_name TEXT,
      attendance_mime TEXT,
      attendance_size INTEGER,
      promo_path TEXT,
      promo_name TEXT,
      promo_mime TEXT,
      promo_size INTEGER,
      improvement_areas TEXT NOT NULL,
      improvement_actions TEXT NOT NULL,
      user_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS event_gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )`
  );

  await new Promise((resolve, reject) => {
    db.run('ALTER TABLE events ADD COLUMN user_id INTEGER', (error) => {
      if (error && !/duplicate column name/i.test(error.message)) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  await run('CREATE INDEX IF NOT EXISTS idx_event_gallery_event_id ON event_gallery(event_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)');
}

module.exports = {
  db,
  init,
  run,
  get,
  all,
  DB_PATH,
};