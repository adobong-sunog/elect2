const dayjs = require('dayjs');
const path = require('path');
const fs = require('fs');
const { run, get, all } = require('../db');

function serializeArray(value) {
  if (!value) {
    return JSON.stringify([]);
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return JSON.stringify([value]);
}

function parseArray(value) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function formatFile(pathValue, name, mime, size) {
  if (!pathValue) {
    return null;
  }
  return {
    path: pathValue,
    name,
    mime,
    size,
  };
}

function baseEventSelect() {
  return `
    SELECT
      e.*,
      u.name AS owner_name,
      u.email AS owner_email
    FROM events e
    LEFT JOIN users u ON e.user_id = u.id
  `;
}

async function listEvents(options = {}) {
  const { ownerId = null, includeAll = false } = options;
  const clauses = [];
  const params = [];

  if (!includeAll && !ownerId) {
    return [];
  }

  if (!includeAll) {
    if (ownerId) {
      clauses.push('e.user_id = ?');
      params.push(ownerId);
    }
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await all(
    `${baseEventSelect()} ${whereClause} ORDER BY datetime(e.activity_date) DESC, e.id DESC`,
    params
  );
  return rows.map(mapEventRow);
}

async function getEventById(eventId) {
  const row = await get(`${baseEventSelect()} WHERE e.id = ?`, [eventId]);
  if (!row) {
    return null;
  }
  const gallery = await all(
    `SELECT id, file_path, original_name, mime_type, size, created_at FROM event_gallery WHERE event_id = ? ORDER BY id DESC`,
    [eventId]
  );
  return { ...mapEventRow(row), gallery };
}

async function createEvent(data, galleryFiles = []) {
  const timestamp = dayjs().toISOString();
  const payload = [
    data.title,
    data.leader_names,
    data.leader_email,
    data.activity_date,
    data.venue,
    serializeArray(data.nurtures),
    data.aims,
    data.impact_summary,
    data.primary_beneficiaries,
    data.secondary_beneficiaries,
    data.secondary_beneficiaries_count,
    data.attendance_path || null,
    data.attendance_name || null,
    data.attendance_mime || null,
    data.attendance_size || null,
    data.promo_path || null,
    data.promo_name || null,
    data.promo_mime || null,
    data.promo_size || null,
    serializeArray(data.improvement_areas),
    data.improvement_actions,
    data.user_id || null,
    timestamp,
    timestamp,
  ];

  const result = await run(
    `INSERT INTO events (
      title,
      leader_names,
      leader_email,
      activity_date,
      venue,
      nurtures,
      aims,
      impact_summary,
      primary_beneficiaries,
      secondary_beneficiaries,
      secondary_beneficiaries_count,
      attendance_path,
      attendance_name,
      attendance_mime,
      attendance_size,
      promo_path,
      promo_name,
      promo_mime,
      promo_size,
      improvement_areas,
      improvement_actions,
      user_id,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload
  );

  if (galleryFiles.length > 0) {
    await insertGalleryFiles(result.id, galleryFiles);
  }

  return getEventById(result.id);
}

async function updateEvent(eventId, data, galleryFiles = []) {
  const timestamp = dayjs().toISOString();
  const payload = [
    data.title,
    data.leader_names,
    data.leader_email,
    data.activity_date,
    data.venue,
    serializeArray(data.nurtures),
    data.aims,
    data.impact_summary,
    data.primary_beneficiaries,
    data.secondary_beneficiaries,
    data.secondary_beneficiaries_count,
    data.attendance_path || null,
    data.attendance_name || null,
    data.attendance_mime || null,
    data.attendance_size || null,
    data.promo_path || null,
    data.promo_name || null,
    data.promo_mime || null,
    data.promo_size || null,
    serializeArray(data.improvement_areas),
    data.improvement_actions,
    data.user_id || null,
    timestamp,
    eventId,
  ];

  await run(
    `UPDATE events SET
      title = ?,
      leader_names = ?,
      leader_email = ?,
      activity_date = ?,
      venue = ?,
      nurtures = ?,
      aims = ?,
      impact_summary = ?,
      primary_beneficiaries = ?,
      secondary_beneficiaries = ?,
      secondary_beneficiaries_count = ?,
      attendance_path = ?,
      attendance_name = ?,
      attendance_mime = ?,
      attendance_size = ?,
      promo_path = ?,
      promo_name = ?,
      promo_mime = ?,
      promo_size = ?,
      improvement_areas = ?,
      improvement_actions = ?,
      user_id = ?,
      updated_at = ?
    WHERE id = ?`,
    payload
  );

  if (galleryFiles.length > 0) {
    await insertGalleryFiles(eventId, galleryFiles);
  }

  return getEventById(eventId);
}

async function deleteEvent(eventId) {
  const eventRow = await get(
    `SELECT attendance_path, promo_path FROM events WHERE id = ?`,
    [eventId]
  );
  const galleryRows = await all(
    `SELECT file_path FROM event_gallery WHERE event_id = ?`,
    [eventId]
  );

  await run(`DELETE FROM events WHERE id = ?`, [eventId]);

  const paths = [];
  if (eventRow) {
    if (eventRow.attendance_path) {
      paths.push(eventRow.attendance_path);
    }
    if (eventRow.promo_path) {
      paths.push(eventRow.promo_path);
    }
  }
  galleryRows.forEach((row) => {
    if (row && row.file_path) {
      paths.push(row.file_path);
    }
  });

  paths.forEach((relativePath) => {
    const absolutePath = path.join(__dirname, '../../', relativePath);
    fs.promises.unlink(absolutePath).catch(() => {});
  });
}

async function removeGalleryItems(eventId, galleryIds = []) {
  if (!galleryIds || galleryIds.length === 0) {
    return;
  }

  const placeholders = galleryIds.map(() => '?').join(',');
  const lookupParams = [eventId, ...galleryIds];
  const rows = await all(
    `SELECT file_path FROM event_gallery WHERE event_id = ? AND id IN (${placeholders})`,
    lookupParams
  );

  await run(
    `DELETE FROM event_gallery WHERE event_id = ? AND id IN (${placeholders})`,
    lookupParams
  );

  rows.forEach((row) => {
    if (row && row.file_path) {
      const absolutePath = path.join(__dirname, '../../', row.file_path);
      fs.promises.unlink(absolutePath).catch(() => {});
    }
  });
}

async function insertGalleryFiles(eventId, galleryFiles) {
  const timestamp = dayjs().toISOString();
  for (const file of galleryFiles) {
    await run(
      `INSERT INTO event_gallery (event_id, file_path, original_name, mime_type, size, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [eventId, file.path, file.originalname, file.mimetype, file.size, timestamp]
    );
  }
}

function mapEventRow(row) {
  return {
    id: row.id,
    title: row.title,
    leader_names: row.leader_names,
    leader_email: row.leader_email,
    activity_date: row.activity_date,
    venue: row.venue,
    nurtures: parseArray(row.nurtures),
    aims: row.aims,
    impact_summary: row.impact_summary,
    primary_beneficiaries: row.primary_beneficiaries,
    secondary_beneficiaries: row.secondary_beneficiaries,
    secondary_beneficiaries_count: row.secondary_beneficiaries_count,
    attendance: formatFile(
      row.attendance_path,
      row.attendance_name,
      row.attendance_mime,
      row.attendance_size
    ),
    promo: formatFile(
      row.promo_path,
      row.promo_name,
      row.promo_mime,
      row.promo_size
    ),
    improvement_areas: parseArray(row.improvement_areas),
    improvement_actions: row.improvement_actions,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_id: row.user_id,
    owner: row.owner_name
      ? { name: row.owner_name, email: row.owner_email }
      : null,
  };
}

module.exports = {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  removeGalleryItems,
};
