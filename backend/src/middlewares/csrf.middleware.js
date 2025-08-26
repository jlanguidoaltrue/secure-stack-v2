import crypto from 'crypto';

// Simple CSRF protection middleware (alternative to deprecated csurf)
const csrfTokens = new Map();

// Clean up old tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, timestamp] of csrfTokens.entries()) {
    if (now - timestamp > 3600000) { // 1 hour
      csrfTokens.delete(token);
    }
  }
}, 300000); // Clean every 5 minutes

export function generateCSRFToken(req, res, next) {
  if (req.method === 'GET') {
    const token = crypto.randomBytes(32).toString('hex');
    csrfTokens.set(token, Date.now());
    res.locals.csrfToken = token;
    res.setHeader('X-CSRF-Token', token);
  }
  next();
}

export function validateCSRFToken(req, res, next) {
  // Skip CSRF validation for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for API endpoints that use JWT (stateless)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!token) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  if (!csrfTokens.has(token)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  // Remove token after use (one-time use)
  csrfTokens.delete(token);
  next();
}

// Middleware to add CSRF token to responses
export function addCSRFToResponse(req, res, next) {
  const originalJson = res.json;
  res.json = function(data) {
    if (res.locals.csrfToken) {
      data = { ...data, csrfToken: res.locals.csrfToken };
    }
    return originalJson.call(this, data);
  };
  next();
}
