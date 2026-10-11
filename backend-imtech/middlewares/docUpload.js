const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { badRequest } = require('../utils/errors');

// Upload de fichiers avec multer : stockage dans uploads/<dossier>, filtrage par type MIME
// et limite de taille.

// Types acceptés par défaut (si l'uploader ne précise pas `options.types`)
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

// Champs dont le fichier doit être redirigé vers un autre dossier que celui par défaut
const FIELD_OVERRIDES = {
  photo: 'utilisateurs',
};

// Crée un middleware multer qui enregistre dans uploads/<folderName>.
// options : types (Set de MIME autorisés), messageType (erreur si refusé), maxSizeMb (défaut 5 Mo).
function createUploader(folderName, options = {}) {
  const baseUploadDir = path.join(__dirname, '..', 'uploads');
  const defaultDirectory = path.join(baseUploadDir, folderName);
  fs.mkdirSync(defaultDirectory, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, file, callback) => {
      const sousDossier = FIELD_OVERRIDES[file.fieldname] || folderName;
      const dest = path.join(baseUploadDir, sousDossier);
      fs.mkdirSync(dest, { recursive: true }); // s'assure que le dossier cible existe aussi
      callback(null, dest);
    },
    // Nom final : <timestamp>-<nom-original-nettoyé>.<ext> pour éviter collisions et caractères spéciaux
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const baseName = path.basename(file.originalname, extension).replace(/[^a-z0-9]/gi, '-').toLowerCase();
      callback(null, `${Date.now()}-${baseName}${extension}`);
    },
  });

  const typesAutorises = options.types || allowedMimeTypes;

  return multer({
    storage,
    limits: { fileSize: options.maxSizeMb ? options.maxSizeMb * 1024 * 1024 : 5 * 1024 * 1024 },
    // Liste restreinte (options.types) : erreur 400 explicite si refusé.
    // Liste par défaut : le fichier non autorisé est simplement ignoré.
    fileFilter: (_req, file, callback) => {
      if (options.types && !typesAutorises.has(file.mimetype)) {
        return callback(badRequest(options.messageType || 'Type de fichier non autorisé.'));
      }
      callback(null, typesAutorises.has(file.mimetype));
    },
  });
}

// Supports de cours : formats affichables dans le lecteur sécurisé (web et mobile).
// PDF et images sont filigranés à la volée ; audio et vidéo sont lus tels quels (lecteur intégré).
const TYPES_SUPPORT = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  // Audio
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm',
  // Vidéo (mp4 / webm : lisibles par tous les navigateurs et les WebView Android / iOS)
  'video/mp4', 'video/webm', 'video/quicktime',
]);

module.exports = createUploader;
module.exports.TYPES_SUPPORT = TYPES_SUPPORT;