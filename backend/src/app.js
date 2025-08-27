import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { envVars } from "./config/envVars.js";
import {
  sanitizeInput,
  preventNoSQLInjection,
  userRateLimit,
} from "./middlewares/security.middleware.js";
import {
  generateCSRFToken,
  addCSRFToResponse,
} from "./middlewares/csrf.middleware.js";
import { connectDb } from "./config/db.js";
import apiRoutes from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";
import { setupSwagger } from "./docs/swagger.js";
import { initPassport } from "./passport/index.js";

const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = envVars.CORS_ORIGIN.split(",").map((s) => s.trim());

    // In development, be more permissive
    if (envVars.NODE_ENV === "development") {
      return callback(null, true);
    }

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error("CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token",
    "X-Requested-With",
  ],
  exposedHeaders: ["X-CSRF-Token"],
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "http://localhost:3000",
          "http://localhost:4000",
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 9999999999999999999, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 9999999999999999999, // limit each IP to 5 auth requests per windowMs
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use("/api/auth", authLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
if (envVars.NODE_ENV !== "production") app.use(morgan("dev"));

// Security middleware
app.use(sanitizeInput);
app.use(preventNoSQLInjection);
app.use(generateCSRFToken);
app.use(addCSRFToResponse);

await connectDb();

// serve static uploads
app.use("/uploads", (await import("express")).default.static("uploads"));

// Health
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Swagger
setupSwagger(app);

// Passport
const passport = initPassport();
app.use(passport.initialize());

// API routes
app.use("/api", apiRoutes);

// Root
app.get("/", (_req, res) => res.send("API is running"));

// centralized error handler
app.use(notFound);
app.use(errorHandler);

// Global error handlers for unhandled errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Log to database if possible
  if (err.message) {
    const fakeReq = {
      originalUrl: "uncaught-exception",
      method: "SYSTEM",
      headers: {},
      body: {},
      query: {},
      params: {},
      ip: "system",
    };

    import("./middlewares/error.middleware.js").then(({ errorHandler }) => {
      // Create a fake response object
      const fakeRes = {
        status: () => ({ json: () => {} }),
        json: () => {},
      };
      errorHandler(err, fakeReq, fakeRes, () => {});
    });
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Log to database if possible
  const err = new Error(`Unhandled Rejection: ${reason}`);
  const fakeReq = {
    originalUrl: "unhandled-rejection",
    method: "SYSTEM",
    headers: {},
    body: {},
    query: {},
    params: {},
    ip: "system",
  };

  import("./middlewares/error.middleware.js").then(({ errorHandler }) => {
    const fakeRes = {
      status: () => ({ json: () => {} }),
      json: () => {},
    };
    errorHandler(err, fakeReq, fakeRes, () => {});
  });
});

export default app;
