import { body, param, query, validationResult } from "express-validator";
import DOMPurify from "isomorphic-dompurify";

// XSS Protection - Sanitize input
export function sanitizeInput(req, res, next) {
  const sanitizeObject = (obj) => {
    if (typeof obj === "string") {
      return DOMPurify.sanitize(obj, { ALLOWED_TAGS: [] }); // Strip all HTML
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === "object") {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

// NoSQL Injection Protection
export function preventNoSQLInjection(req, res, next) {
  const checkForInjection = (obj) => {
    if (typeof obj === "string") {
      // Check for MongoDB operators
      if (obj.includes("$") || obj.includes("{") || obj.includes("}")) {
        return true;
      }
    }
    if (Array.isArray(obj)) {
      return obj.some(checkForInjection);
    }
    if (obj && typeof obj === "object") {
      // Check for MongoDB operators in keys
      for (const key of Object.keys(obj)) {
        if (key.startsWith("$") || checkForInjection(obj[key])) {
          return true;
        }
      }
    }
    return false;
  };

  if (
    checkForInjection(req.body) ||
    checkForInjection(req.query) ||
    checkForInjection(req.params)
  ) {
    return res.status(400).json({ error: "Invalid input detected" });
  }

  next();
}

// SSRF Protection - Validate URLs
export function validateURL(url) {
  try {
    const parsed = new URL(url);

    // Block private/internal networks
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and loopback
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    ) {
      return false;
    }

    // Block private IP ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
      /^224\./, // Multicast
    ];

    if (privateRanges.some((range) => range.test(hostname))) {
      return false;
    }

    // Only allow HTTP/HTTPS
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Validation error handler
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array(),
    });
  }
  next();
}

// Common validation rules
export const validationRules = {
  // User validation
  createUser: [
    body("email")
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage("Valid email is required"),
    body("username")
      .isAlphanumeric()
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be 3-30 alphanumeric characters"),
    body("password")
      .isLength({ min: 8, max: 128 })
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        "Password must be 8-128 characters with uppercase, lowercase, number, and special character"
      ),
    body("firstName")
      .optional()
      .isLength({ max: 50 })
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage("First name must contain only letters and spaces"),
    body("lastName")
      .optional()
      .isLength({ max: 50 })
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage("Last name must contain only letters and spaces"),
  ],

  // Login validation
  login: [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password").isLength({ min: 1 }).withMessage("Password is required"),
  ],

  // MongoDB ObjectId validation
  mongoId: [param("id").isMongoId().withMessage("Invalid ID format")],

  // Pagination validation
  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Page must be between 1 and 1000"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],

  // Search validation
  search: [
    query("search")
      .optional()
      .isLength({ max: 100 })
      .matches(/^[a-zA-Z0-9\s\-_.@]*$/)
      .withMessage("Search term contains invalid characters"),
  ],

  // File upload validation (additional to multer)
  fileUpload: [
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description must be less than 500 characters"),
  ],

  // Error log validation
  errorLogFilter: [
    query("level")
      .optional()
      .isIn(["error", "warn", "info", "debug"])
      .withMessage("Invalid log level"),
    query("resolved")
      .optional()
      .isBoolean()
      .withMessage("Resolved must be boolean"),
  ],
};

// Rate limiting by user ID (in addition to IP-based limiting)
const userRequestCounts = new Map();

export function userRateLimit(maxRequests = 1000, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    if (!req.user?.id) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!userRequestCounts.has(userId)) {
      userRequestCounts.set(userId, []);
    }

    const userRequests = userRequestCounts.get(userId);

    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      (timestamp) => timestamp > windowStart
    );

    if (validRequests.length >= maxRequests)
      // ADD THIS IN PRODUCTION
      //   {
      //   return res.status(429).json({
      //     error: 'Too many requests from this user',
      //     retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
      //   });
      // }

      validRequests.push(now);
    userRequestCounts.set(userId, validRequests);

    next();
  };
}

// Clean up old user request counts periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;

  for (const [userId, requests] of userRequestCounts.entries()) {
    const validRequests = requests.filter(
      (timestamp) => timestamp > now - windowMs
    );
    if (validRequests.length === 0) {
      userRequestCounts.delete(userId);
    } else {
      userRequestCounts.set(userId, validRequests);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes
