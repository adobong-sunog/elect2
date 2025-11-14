const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const {
  createEvent,
  listEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  removeGalleryItems,
} = require('../services/eventService');
const { nurturesOptions, improvementOptions } = require('../validators/eventValidator');
const { toRelativePath, MAX_PROMO_SIZE } = require('../middleware/upload');

function mapFormData(body) {
  const toArray = (value) => {
    if (Array.isArray(value)) {
      return value.filter((item) => item !== undefined && item !== null && item !== '');
    }
    if (value === undefined || value === null || value === '') {
      return [];
    }
    return [value];
  };

  const splitCustom = (value) => {
    if (!value) {
      return [];
    }
    return String(value)
      .split(/[,\n]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  };

  const nurtures = toArray(body.nurtures);
  const nurturesCustom = splitCustom(body.nurtures_other);
  const improvements = toArray(body.improvement_areas);
  const improvementsCustom = splitCustom(body.improvement_other);

  return {
    title: body.title || '',
    leader_names: body.leader_names || '',
    leader_email: (body.leader_email || '').toLowerCase(),
    activity_date: body.activity_date || '',
    venue: body.venue || '',
    nurtures: [...nurtures, ...nurturesCustom],
    nurtures_other: nurturesCustom.join(', '),
    aims: body.aims || '',
    impact_summary: body.impact_summary || '',
    primary_beneficiaries: body.primary_beneficiaries || '',
    secondary_beneficiaries: body.secondary_beneficiaries || '',
    secondary_beneficiaries_count: body.secondary_beneficiaries_count || 0,
    improvement_areas: [...improvements, ...improvementsCustom],
    improvement_other: improvementsCustom.join(', '),
    improvement_actions: body.improvement_actions || '',
  };
}

function cleanupUploads(filesCollection) {
  if (!filesCollection) {
    return;
  }
  Object.values(filesCollection).forEach((fileList) => {
    (fileList || []).forEach((file) => {
      fs.promises.unlink(file.path).catch(() => {});
    });
  });
}

function renderForm(res, view, { event, errors = [], mode = 'create' }) {
  const standardNurtures = new Set(nurturesOptions);
  const standardImprovements = new Set(improvementOptions);

  const customNurtures = (event.nurtures || []).filter((item) => !standardNurtures.has(item));
  const customImprovements = (event.improvement_areas || []).filter((item) => !standardImprovements.has(item));

  const preparedEvent = {
    ...event,
    nurtures_other: event.nurtures_other || customNurtures.join(', '),
    improvement_other: event.improvement_other || customImprovements.join(', '),
  };

  res.render(view, {
    event: preparedEvent,
    errors,
    mode,
    nurturesOptions,
    improvementOptions,
    title: mode === 'edit' ? 'Edit Activity' : 'Create Activity',
  });
}

async function showDashboard(req, res) {
  const events = await listEvents({ ownerId: req.user.id });

  res.render('home', {
    events,
    title: 'Your Activities',
  });
}

function renderNewForm(req, res) {
  const event = mapFormData({
    leader_email: req.user.email,
    leader_names: req.user.name,
  });
  renderForm(res, 'events/new', { event, mode: 'create' });
}

async function handleCreate(req, res, next) {
  const errors = validationResult(req);
  let promoOversized = null;
  const attendanceFile = req.files?.attendance?.[0] || null;
  const promoFile = req.files?.promo?.[0] || null;
  const galleryFiles = req.files?.gallery || [];

  if (promoFile && promoFile.size > MAX_PROMO_SIZE) {
    promoOversized = 'Promotional material must be 1 MB or smaller.';
  }

  if (!errors.isEmpty() || promoOversized) {
    cleanupUploads(req.files);
    const mapped = mapFormData(req.body);
    const errorBag = errors.array();
    if (promoOversized) {
      errorBag.push({ msg: promoOversized, param: 'promo' });
    }
    return renderForm(res, 'events/new', {
      event: mapped,
      errors: errorBag,
      mode: 'create',
    });
  }

  try {
    const payload = mapFormData(req.body);
    payload.secondary_beneficiaries_count = Number(payload.secondary_beneficiaries_count) || 0;
    payload.user_id = req.user.id;

    if (attendanceFile) {
      payload.attendance_path = toRelativePath(attendanceFile.path);
      payload.attendance_name = attendanceFile.originalname;
      payload.attendance_mime = attendanceFile.mimetype;
      payload.attendance_size = attendanceFile.size;
    }

    if (promoFile) {
      payload.promo_path = toRelativePath(promoFile.path);
      payload.promo_name = promoFile.originalname;
      payload.promo_mime = promoFile.mimetype;
      payload.promo_size = promoFile.size;
    }

    const normalizedGallery = galleryFiles.map((file) => ({
      path: toRelativePath(file.path),
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    }));

    await createEvent(payload, normalizedGallery);
    req.flash('success', 'Activity saved successfully.');
    return res.redirect('/');
  } catch (error) {
    cleanupUploads(req.files);
    return next(error);
  }
}

async function renderEventDetail(req, res, next) {
  try {
    const event = await getEventById(req.params.id);
    if (!event) {
      return res.status(404).render('errors/404', { title: 'Activity Not Found' });
    }
    if (!canAccessEvent(event, req.user)) {
      req.flash('error', 'You are not authorized to view that activity.');
      return res.redirect('/');
    }
    return res.render('events/show', { event, title: event.title });
  } catch (error) {
    return next(error);
  }
}

async function renderEditForm(req, res, next) {
  try {
    const event = await getEventById(req.params.id);
    if (!event) {
      return res.status(404).render('errors/404', { title: 'Activity Not Found' });
    }
    if (!canModifyEvent(event, req.user)) {
      req.flash('error', 'You are not authorized to edit that activity.');
      return res.redirect('/');
    }
    return renderForm(res, 'events/edit', {
      event,
      mode: 'edit',
    });
  } catch (error) {
    return next(error);
  }
}

async function handleUpdate(req, res, next) {
  const eventId = req.params.id;
  let existing;
  try {
    existing = await getEventById(eventId);
    if (!existing) {
      cleanupUploads(req.files);
      return res.status(404).render('errors/404', { title: 'Activity Not Found' });
    }
    if (!canModifyEvent(existing, req.user)) {
      cleanupUploads(req.files);
      req.flash('error', 'You are not authorized to modify that activity.');
      return res.redirect('/');
    }
  } catch (error) {
    cleanupUploads(req.files);
    return next(error);
  }

  const errors = validationResult(req);
  const promoFile = req.files?.promo?.[0] || null;
  const galleryFiles = req.files?.gallery || [];
  const attendanceFile = req.files?.attendance?.[0] || null;
  let promoOversized = null;

  if (promoFile && promoFile.size > MAX_PROMO_SIZE) {
    promoOversized = 'Promotional material must be 1 MB or smaller.';
  }

  if (!errors.isEmpty() || promoOversized) {
    cleanupUploads(req.files);
    const mapped = { ...existing, ...mapFormData(req.body) };
    mapped.gallery = existing.gallery;
    const errorBag = errors.array();
    if (promoOversized) {
      errorBag.push({ msg: promoOversized, param: 'promo' });
    }
    return renderForm(res, 'events/edit', {
      event: mapped,
      errors: errorBag,
      mode: 'edit',
    });
  }

  try {
    const payload = { ...existing, ...mapFormData(req.body) };
    payload.secondary_beneficiaries_count = Number(payload.secondary_beneficiaries_count) || 0;
    payload.user_id = existing.user_id || req.user.id;

    if (req.body.remove_attendance === 'on' || attendanceFile) {
      if (existing.attendance?.path) {
        const absolutePath = path.join(__dirname, '../../', existing.attendance.path);
        fs.promises.unlink(absolutePath).catch(() => {});
      }
      payload.attendance_path = null;
      payload.attendance_name = null;
      payload.attendance_mime = null;
      payload.attendance_size = null;
    }

    if (req.body.remove_promo === 'on' || promoFile) {
      if (existing.promo?.path) {
        const absolutePath = path.join(__dirname, '../../', existing.promo.path);
        fs.promises.unlink(absolutePath).catch(() => {});
      }
      payload.promo_path = null;
      payload.promo_name = null;
      payload.promo_mime = null;
      payload.promo_size = null;
    }

    if (attendanceFile) {
      payload.attendance_path = toRelativePath(attendanceFile.path);
      payload.attendance_name = attendanceFile.originalname;
      payload.attendance_mime = attendanceFile.mimetype;
      payload.attendance_size = attendanceFile.size;
    }

    if (promoFile) {
      payload.promo_path = toRelativePath(promoFile.path);
      payload.promo_name = promoFile.originalname;
      payload.promo_mime = promoFile.mimetype;
      payload.promo_size = promoFile.size;
    }

    const normalizedGallery = galleryFiles.map((file) => ({
      path: toRelativePath(file.path),
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    }));

    const rawGalleryIds = req.body.remove_gallery;
    const galleryIdsToRemove = [];
    if (Array.isArray(rawGalleryIds)) {
      rawGalleryIds.forEach((id) => {
        const numeric = Number(id);
        if (Number.isInteger(numeric)) {
          galleryIdsToRemove.push(numeric);
        }
      });
    } else if (rawGalleryIds) {
      const numeric = Number(rawGalleryIds);
      if (Number.isInteger(numeric)) {
        galleryIdsToRemove.push(numeric);
      }
    }

    if (galleryIdsToRemove.length > 0) {
      await removeGalleryItems(eventId, galleryIdsToRemove);
    }

    const event = await updateEvent(eventId, payload, normalizedGallery);
    req.flash('success', 'Activity updated successfully.');
    return res.redirect(`/events/${event.id}`);
  } catch (error) {
    cleanupUploads(req.files);
    return next(error);
  }
}

async function handleDelete(req, res, next) {
  const eventId = req.params.id;
  try {
    const event = await getEventById(eventId);
    if (!event) {
      req.flash('error', 'Activity not found.');
      return res.redirect('/');
    }
    if (!canModifyEvent(event, req.user)) {
      req.flash('error', 'You are not authorized to delete that activity.');
      return res.redirect('/');
    }

    await deleteEvent(eventId);
    req.flash('success', 'Activity deleted successfully.');
    return res.redirect('/');
  } catch (error) {
    return next(error);
  }
}

function canAccessEvent(event, user) {
  if (!event || !user) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  return event.user_id === user.id;
}

function canModifyEvent(event, user) {
  return canAccessEvent(event, user);
}

module.exports = {
  showDashboard,
  renderNewForm,
  handleCreate,
  renderEventDetail,
  renderEditForm,
  handleUpdate,
  handleDelete,
};
