const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function createUploader(prefix) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '.jpg';
      const cleanName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${safeExt}`;
      cb(null, cleanName);
    }
  });

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only safe image files (JPEG, PNG, WebP, GIF) are allowed'), false);
    }
  };

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter
  });
}

function safeUnlinkUpload(relativePhotoUrl) {
  if (!relativePhotoUrl || typeof relativePhotoUrl !== 'string') return;
  if (!relativePhotoUrl.startsWith('/uploads/')) return;
  
  const filename = path.basename(relativePhotoUrl);
  const fullPath = path.join(UPLOADS_DIR, filename);
  
  // Guard against directory traversal
  const resolvedPath = path.resolve(fullPath);
  const resolvedUploadsDir = path.resolve(UPLOADS_DIR);
  
  if (resolvedPath.startsWith(resolvedUploadsDir) && fs.existsSync(resolvedPath)) {
    try {
      fs.unlinkSync(resolvedPath);
    } catch (_) {}
  }
}

module.exports = {
  createUploader,
  safeUnlinkUpload,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_EXTENSIONS
};
