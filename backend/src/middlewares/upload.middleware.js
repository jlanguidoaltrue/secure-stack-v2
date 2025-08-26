import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

const root = process.cwd();
const uploadDir = path.join(root, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// File type signatures for validation
const FILE_SIGNATURES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46]
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = crypto.randomBytes(16).toString("hex");
    cb(null, `${base}${ext}`);
  }
});

function validateFileSignature(buffer, mimetype) {
  const signature = FILE_SIGNATURES[mimetype];
  if (!signature) return false;
  
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }
  return true;
}

function fileFilter(_req, file, cb){
  const allowed = ["image/jpeg","image/png","image/webp","image/gif","application/pdf"];
  
  // Check MIME type
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Unsupported file type"));
  }
  
  // Validate file extension matches MIME type
  const ext = path.extname(file.originalname || "").toLowerCase();
  const validExtensions = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'image/gif': ['.gif'],
    'application/pdf': ['.pdf']
  };
  
  if (!validExtensions[file.mimetype]?.includes(ext)) {
    return cb(new Error("File extension does not match file type"));
  }
  
  cb(null, true);
}

// Simulated antivirus scanning (in production, integrate with real AV service)
async function simulateAntivirusScan(filePath) {
  return new Promise((resolve) => {
    // Simulate scanning delay
    setTimeout(() => {
      // In production, this would call actual antivirus API
      // For now, we'll just check for suspicious patterns in filename
      const filename = path.basename(filePath).toLowerCase();
      const suspiciousPatterns = ['virus', 'malware', 'trojan', 'backdoor'];
      const isSuspicious = suspiciousPatterns.some(pattern => filename.includes(pattern));
      
      resolve({
        clean: !isSuspicious,
        threat: isSuspicious ? 'Suspicious filename detected' : null
      });
    }, 100);
  });
}

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
    fields: 10
  }
}).single("file");

// Enhanced upload middleware with additional security checks
export const secureUpload = (req, res, next) => {
  uploadSingle(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Unexpected file field.' });
        }
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return next();
    }

    try {
      // Read first few bytes to validate file signature
      const buffer = fs.readFileSync(req.file.path, { start: 0, end: 10 });
      
      if (!validateFileSignature(buffer, req.file.mimetype)) {
        // Delete the uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'File signature does not match declared type' });
      }

      // Simulate antivirus scan
      const scanResult = await simulateAntivirusScan(req.file.path);
      if (!scanResult.clean) {
        // Delete the infected file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: `File rejected: ${scanResult.threat}` });
      }

      // Add security metadata to request
      req.file.securityChecked = true;
      req.file.scanResult = scanResult;
      
      next();
    } catch (error) {
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'File security validation failed' });
    }
  });
};
