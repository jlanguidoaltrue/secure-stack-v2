import AppError from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { sendMail } from "../utils/mailer.js";
import { envVars } from "../config/envVars.js";
import ErrorLog from "../models/ErrorLog.js";

export function notFound(req, res, next){
  next(new AppError(`Not Found - ${req.originalUrl}`, 404));
}

export function errorHandler(err, req, res, _next){
  const status = err.statusCode || 500;
  const msg = err.message || "Server error";
  
  // Log ALL errors (not just 500+) to database and email for debugging
  logger.error({ err, url: req.originalUrl, status }, "Error occurred");
  
  // Log error to database for all errors
  logErrorToDatabase(err, req, status).catch(dbErr => {
    logger.error({ dbErr }, "Failed to log error to database");
  });
  
  // Send detailed error report to email if configured (for all errors in development)
  if (envVars.CLIENT_ERROR_EMAIL && (status >= 500 || envVars.NODE_ENV === 'development')) {
    sendErrorEmail(err, req, status).catch(emailErr => {
      logger.error({ emailErr }, "Failed to send error email");
    });
  }
  
  res.status(status).json({ message: msg });
}

async function logErrorToDatabase(err, req, status) {
  try {
    const errorStatus = status || err.statusCode || 500;
    const errorLog = new ErrorLog({
      tenantId: req.user?.tenantId || null,
      userId: req.user?.id || req.user?._id || null,
      level: errorStatus >= 500 ? 'error' : 'warn',
      message: err.message || 'Unknown error',
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      statusCode: errorStatus,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection?.remoteAddress,
      requestId: req.id || req.headers['x-request-id'],
      metadata: {
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params
      },
      tags: [req.method?.toLowerCase(), err.name || 'UnknownError']
    });

    await errorLog.save();
  } catch (dbError) {
    logger.error({ dbError }, "Failed to save error log to database");
  }
}

async function sendErrorEmail(err, req) {
  try {
    const subject = `[Backend Error] ${err.message || 'Server Error'}`;
    const html = `
      <h3>Backend Server Error</h3>
      <p><b>Time:</b> ${new Date().toISOString()}</p>
      <p><b>URL:</b> ${req.originalUrl || 'Unknown'}</p>
      <p><b>Method:</b> ${req.method || 'Unknown'}</p>
      <p><b>IP:</b> ${req.ip || 'Unknown'}</p>
      <p><b>User Agent:</b> ${req.get('User-Agent') || 'Unknown'}</p>
      <p><b>User ID:</b> ${req.user?.sub || req.user?.id || req.user?._id || 'Anonymous'}</p>
      <p><b>Status Code:</b> ${err.statusCode || 500}</p>
      <p><b>Error Message:</b> ${err.message || 'Unknown error'}</p>
      
      <h4>Request Headers:</h4>
      <pre>${JSON.stringify(req.headers, null, 2)}</pre>
      
      <h4>Request Body:</h4>
      <pre>${JSON.stringify(req.body, null, 2)}</pre>
      
      <h4>Request Query:</h4>
      <pre>${JSON.stringify(req.query, null, 2)}</pre>
      
      <h4>Stack Trace:</h4>
      <pre>${(err.stack || 'No stack trace available').replace(/[<>&]/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[s]))}</pre>
    `;
    
    await sendMail({
      to: envVars.CLIENT_ERROR_EMAIL,
      subject,
      html
    });
  } catch (emailError) {
    logger.error({ emailError }, "Failed to send error email");
  }
}
