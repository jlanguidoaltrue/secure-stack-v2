// src/middlewares/requireMfa.middleware.js
import AppError from "../utils/AppError.js";
import User from "../models/User.js";

const ALLOW_PREFIXES = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/mfa",
  "/health",
  "/api/docs",
];

// Special endpoints that only allow specific operations during MFA setup
const MFA_SETUP_ALLOWLIST = {
  "GET:/api/profile/me": () => true, // Always allow profile reads
  "PATCH:/api/profile/me": (req) => {
    // During MFA setup, only allow email and phone updates
    const allowedFields = ["email", "phone"];
    const requestFields = Object.keys(req.body || {});
    return requestFields.every(field => allowedFields.includes(field));
  }
};

export async function requireMfa(req, res, next) {
  const url = req.originalUrl || "";
  const method = req.method;
  
  // Check standard allowed prefixes
  if (ALLOW_PREFIXES.some((p) => url.startsWith(p))) return next();
  
  // Check special MFA setup allowlist
  const key = `${method}:${url}`;
  if (MFA_SETUP_ALLOWLIST[key] && MFA_SETUP_ALLOWLIST[key](req)) {
    return next();
  }

  if (typeof req.user?.mfa === "boolean") {
    if (req.user.mfa) return next();
    return res
      .status(428)
      .json({ message: "MFA setup required", data: { goto: "/mfa-setup" } });
  }

  // fallback check
  const user = await User.findById(req.user?.id).select("mfaEnabled");
  if (user?.mfaEnabled) return next();

  return res
    .status(428)
    .json({ message: "MFA setup required", data: { goto: "/mfa-setup" } });
}
