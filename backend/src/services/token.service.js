import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Session.js";
import AppError from "../utils/AppError.js";
import { envVars } from "../config/envVars.js";

function signAccess({ sub, role, mfa, sid }) {
  return jwt.sign(
    { sub, role, mfa, sid }, // include sid (session/family id)
    envVars.JWT_SECRET,
    {
      expiresIn: envVars.JWT_EXPIRES_IN,
      issuer: envVars.JWT_ISSUER,
      audience: envVars.JWT_AUD,
    }
  );
}

function signRefresh({ sub, sid, jti }) {
  return jwt.sign(
    { sub, sid, jti, use: "refresh" }, // jti = this refresh id
    envVars.JWT_REFRESH_SECRET,
    {
      expiresIn: envVars.REFRESH_EXPIRES_IN,
      issuer: envVars.JWT_ISSUER,
      audience: envVars.JWT_AUD,
    }
  );
}

export async function startSession(user, meta = {}) {
  const sid = crypto.randomUUID();
  const jti = crypto.randomUUID();
  const accessToken = signAccess({
    sub: String(user._id),
    role: user.role ?? "user",
    mfa: !!user.mfaEnabled,
    sid,
  });
  const refreshToken = signRefresh({ sub: String(user._id), sid, jti });

  await Session.create({
    userId: user._id,
    family: sid,
    currentId: jti,
    meta: {
      ip: meta.ip,
      userAgent: meta.userAgent,
      fpHash: meta.fpHash || null, // optional device fingerprint hash
    },
  });

  return { accessToken, refreshToken, sid };
}

export async function rotateRefreshToken(presentedToken, meta = {}) {
  let payload;
  try {
    payload = jwt.verify(presentedToken, envVars.JWT_REFRESH_SECRET, {
      issuer: envVars.JWT_ISSUER,
      audience: envVars.JWT_AUD,
    });
  } catch {
    throw new AppError("Invalid refresh", 401);
  }

  const { sub, sid, jti } = payload;
  const session = await Session.findOne({ family: sid, userId: sub });
  if (!session || session.revokedAt) throw new AppError("Invalid refresh", 401);

  // REUSE DETECTION: token jti must match the session’s current pointer
  if (session.currentId !== jti) {
    // Compromised family: revoke and alert
    session.revokedAt = new Date();
    await session.save();
    // (Optional) write an AuditLog “refresh_reuse_detected”
    throw new AppError("Refresh reuse detected", 401);
  }

  // Rotate: advance pointer, mint fresh pair
  const nextJti = crypto.randomUUID();
  session.currentId = nextJti;
  await session.save();

  const accessToken = signAccess({ sub, role: undefined, mfa: undefined, sid }); // role/mfa can be reloaded if needed
  const refreshToken = signRefresh({ sub, sid, jti: nextJti });

  return { accessToken, refreshToken };
}

export async function revokeSessionFamily(userId, sid) {
  await Session.updateMany(
    { userId, family: sid, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );
}
