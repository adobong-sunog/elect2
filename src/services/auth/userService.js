const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');
const { run, get } = require('../../db');

async function createUser({ name, email, password, role = 'leader' }) {
  const timestamp = dayjs().toISOString();
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await run(
    `INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email.toLowerCase(), passwordHash, role, timestamp, timestamp]
  );
  return findUserById(result.id);
}

function findUserByEmail(email) {
  return get(`SELECT * FROM users WHERE lower(email) = lower(?)`, [email]);
}

function findUserById(id) {
  return get(`SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?`, [id]);
}

async function verifyCredentials(email, password) {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return null;
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

async function ensureAdminSeed() {
  const timestamp = dayjs().toISOString();
  const passwordHash = await bcrypt.hash('admin123', 12);
  await run(
    `INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       name = excluded.name,
       password_hash = excluded.password_hash,
       role = 'admin',
       updated_at = excluded.updated_at`,
    ['Admin', 'admin', passwordHash, timestamp, timestamp]
  );
  console.info('Default admin account ensured (username: admin).');
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  verifyCredentials,
  ensureAdminSeed,
};
