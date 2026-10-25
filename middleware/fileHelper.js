const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (_) {}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function createUploader(prefix = 'photo') {
  // Use memoryStorage so file bytes are accessible directly in req.file.buffer
  // This allows persistent storage in MongoDB Atlas and eliminates ephemeral container loss on Render
  const storage = multer.memoryStorage();

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isMimeValid = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const isExtValid = ALLOWED_EXTENSIONS.includes(ext) || ext === '';
    if (isMimeValid && isExtValid) {
      cb(null, true);
    } else {
      cb(new Error('Only safe image files (JPEG, PNG, WebP, GIF) are allowed'), false);
    }
  };

  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter
  });
}

/**
 * Process uploaded file to return a permanent, restart-proof URL.
 * Automatically saves directly into MongoDB Atlas as a Base64 data URL
 * (or Cloudinary if CLOUDINARY_CLOUD_NAME is configured).
 */
async function processUpload(file, prefix = 'photo') {
  if (!file || !file.buffer) return null;

  // 1. Cloudinary upload support (if credentials exist in .env)
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'kalavedika/' + prefix, resource_type: 'image' },
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        );
        stream.end(file.buffer);
      });
      return uploadResult.secure_url;
    } catch (cErr) {
      console.warn('Cloudinary upload error, falling back to persistent MongoDB storage:', cErr.message);
    }
  }

  // 2. Also save local backup on disk if public/uploads is available (for local dev cache)
  try {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '.jpg';
    const localName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${safeExt}`;
    const localPath = path.join(UPLOADS_DIR, localName);
    fs.writeFileSync(localPath, file.buffer);
  } catch (_) {
    // Disk writing errors ignored on ephemeral platforms
  }

  // 3. Persistent storage directly in MongoDB Atlas:
  // Base64 Data URL survives any server restart, container redeploy, or Render free-tier sleep!
  const mime = file.mimetype || 'image/jpeg';
  return `data:${mime};base64,${file.buffer.toString('base64')}`;
}

function safeUnlinkUpload(relativePhotoUrl) {
  if (!relativePhotoUrl || typeof relativePhotoUrl !== 'string') return;
  // If it's a persistent data URL or external CDN URL, there is nothing on local disk to unlink
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
  processUpload,
  safeUnlinkUpload,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_EXTENSIONS
};

