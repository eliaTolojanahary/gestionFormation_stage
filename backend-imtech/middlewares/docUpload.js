const fs = require('fs');
const path = require('path');
const multer = require('multer');

const allowedMimeTypes = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',

  // PDF
  'application/pdf',

  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Texte
  'text/plain',

  // CSV
  'text/csv'
]);
function createUploader(folderName, options = {}) {
  const uploadDirectory = path.join(__dirname, '..', 'uploads', folderName);
  fs.mkdirSync(uploadDirectory, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDirectory),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const baseName = path.basename(file.originalname, extension).replace(/[^a-z0-9]/gi, '-').toLowerCase();
      callback(null, `${Date.now()}-${baseName}${extension}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: options.maxSizeMb ? options.maxSizeMb * 1024 * 1024 : 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, allowedMimeTypes.has(file.mimetype));
    },
  });
}

module.exports = createUploader;