const fs = require('fs');
const path = require('path');
const multer = require('multer');

const ROOT_DIR = path.join(__dirname, '../../');
const UPLOAD_BASE = path.join(ROOT_DIR, 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_PROMO_SIZE = 1 * 1024 * 1024; // 1 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const directoryMap = {
      attendance: path.join(UPLOAD_BASE, 'attendance'),
      promo: path.join(UPLOAD_BASE, 'promo'),
      gallery: path.join(UPLOAD_BASE, 'gallery'),
    };
    const target = directoryMap[file.fieldname] || UPLOAD_BASE;
    fs.mkdirSync(target, { recursive: true });
    cb(null, target);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-z0-9.-]/gi, '_');
    cb(null, `${timestamp}-${sanitized}`);
  },
});

const allowedTypes = {
  attendance: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
  promo: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
  gallery: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
  ],
};

function isAllowed(field, mimetype, originalname) {
  const list = allowedTypes[field] || [];
  if (list.includes(mimetype)) {
    return true;
  }
  const extension = path.extname(originalname).toLowerCase();
  const fallback = {
    attendance: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'],
    promo: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'],
    gallery: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.avi'],
  };
  return (fallback[field] || []).includes(extension);
}

function fileFilter(req, file, cb) {
  if (!isAllowed(file.fieldname, file.mimetype, file.originalname)) {
    return cb(new Error(`Unsupported file type for ${file.fieldname}.`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

const uploadFields = upload.fields([
  { name: 'attendance', maxCount: 1 },
  { name: 'promo', maxCount: 1 },
  { name: 'gallery', maxCount: 10 },
]);

function toRelativePath(absolutePath) {
  return path.relative(ROOT_DIR, absolutePath).replace(/\\/g, '/');
}

module.exports = {
  uploadFields,
  MAX_PROMO_SIZE,
  MAX_FILE_SIZE,
  toRelativePath,
};
