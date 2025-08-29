// services/auth.service.js
import crypto from "crypto";
import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";
import { envVars } from "../config/envVars.js";
import User from "../models/User.js";
import PasswordReset from "../models/PasswordReset.js";
import AuditLog from "../models/AuditLog.js";
import { transporter } from "../utils/mailer.js";
import { createAndSendOtp, verifyUserOtp } from "./otp.service.js";
import {
  generateTotpSecret,
  verifyTotp,
  createBackupCodes,
} from "./totp.service.js";
import {
  startSession,
  rotateRefreshToken,
  revokeSessionFamily,
} from "./token.service.js";

/* ---------- Core helpers kept from your previous service ---------- */

export async function registerUser({
  username,
  email,
  password,
  tenantId = null,
  role = "user",
}) {
  const exists = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username }],
  });
  if (exists) throw new AppError("User already exists", 409);
  const user = new User({
    username,
    email: email.toLowerCase(),
    role,
    tenantId,
  });
  if (password) await user.setPassword(password);
  await user.save();
  return user;
}

export async function findUserByUsernameOrEmail(usernameOrEmail) {
  const q = {
    $or: [
      { email: (usernameOrEmail || "").toLowerCase() },
      { username: usernameOrEmail },
    ],
  };
  const user = await User.findOne(q);
  if (!user) throw new AppError("Invalid credentials", 401);
  return user;
}

export async function verifyPasswordOrLock(user, password) {
  if (user.isLocked) throw new AppError("Account locked. Try later.", 423);
  const ok = await user.checkPassword(password);
  if (!ok) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw new AppError("Invalid credentials", 401);
  }
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();
}

export async function assertAccountUsable(user) {
  if (!user.isActive) throw new AppError("Account disabled", 403);
}

/* ---------------------- New, higher-level flows ---------------------- */

export async function loginOrMfa({ usernameOrEmail, password, meta }) {
  const user = await findUserByUsernameOrEmail(usernameOrEmail);
  await assertAccountUsable(user);
  await verifyPasswordOrLock(user, password);

  if (user.mfaEnabled) {
    const mfaToken = jwt.sign(
      { sub: String(user._id), stage: "mfa" },
      envVars.JWT_SECRET,
      { expiresIn: "5m", issuer: envVars.JWT_ISSUER, audience: envVars.JWT_AUD }
    );
    return {
      mfaRequired: true,
      mfaToken,
      user: toUserDto(user),
    };
  }

  const tokens = await startSession(user, meta);
  await AuditLog.create({
    userId: user._id,
    action: "login",
    meta,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    tenantId: user.tenantId,
  });

  return {
    mfaRequired: false,
    tokens,
    user: toUserDto(user),
  };
}

export async function rotate({ refreshToken, meta }) {
  const out = await rotateRefreshToken(refreshToken, meta);
  return out; // { accessToken, refreshToken? }
}

export async function logoutAndRevoke({ userId, sid }) {
  // Best-effort revoke; audit regardless
  if (userId && sid) {
    await revokeSessionFamily(userId, sid);
  }
  await AuditLog.create({ userId, action: "logout" });
  return { ok: true };
}

/* ------------------------ Password flows ------------------------ */

export async function forgotPasswordFlow({ email, baseUrl }) {
  const user = await User.findOne({ email: (email || "").toLowerCase() });
  if (!user) return true;

  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await PasswordReset.create({ userId: user._id, tokenHash, expiresAt });

  const resetUrl = `${baseUrl}/api/auth/reset?token=${raw}&uid=${user._id}`;
  try {
    await transporter.sendMail({
      to: user.email,
      subject: "Password reset",
      text: `Reset your password: ${resetUrl}`,
      html: `<p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  } catch (e) {
    // swallow mailer errors for security but log server-side
    console.error("Failed sending reset email", e);
  }
  return true;
}

export async function resetPasswordFlow({ uid, token, password }) {
  if (!uid || !token || !password) throw new AppError("Missing params", 400);

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const pr = await PasswordReset.findOne({
    userId: uid,
    tokenHash,
    used: false,
    expiresAt: { $gt: new Date() },
  });
  if (!pr) throw new AppError("Invalid or expired token", 400);

  const user = await User.findById(uid);
  if (!user) throw new AppError("User not found", 404);

  await user.setPassword(password);
  await user.save();

  pr.used = true;
  await pr.save();

  // OPTIONAL but recommended: revoke all sessions for this user here
  // await revokeAllSessionsForUser(uid);

  return true;
}

/* ------------------------ MFA flows ------------------------ */

export async function mfaEnroll({ userId, type, rotate = false }) {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (type === "totp") {
    if (user.mfaEnabled && user.mfaMethod === "totp" && !rotate) {
      throw new AppError(
        "TOTP already enabled. Pass rotate=true to re-enroll.",
        400
      );
    }
    const issuer = process.env.APP_NAME || "SecureBackend";
    const accountName = user.email || user.username;
    const { secret, qrDataUrl, otpauth } = await generateTotpSecret({
      accountName,
      issuer,
    });

    user.totpSecret = secret.base32;

    const normalize = (s) => s.replace(/[\s-]/g, "").toUpperCase();
    const backupCodes = createBackupCodes(8);
    user.backupCodes = backupCodes.map((c) =>
      crypto.createHash("sha256").update(normalize(c)).digest("hex")
    );

    user.mfaEnabled = false;
    user.mfaMethod = undefined;
    await user.save();

    return { secret, qrDataUrl, otpauth, backupCodes };
  }

  if (type === "email" || type === "sms") {
    user.mfaMethod = type;
    user.mfaEnabled = false;
    await user.save();
    return { ok: true };
  }

  throw new AppError("Unsupported MFA type", 400);
}

export async function mfaVerify({ userId, token }) {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const secret = user.getTotpSecret ? user.getTotpSecret() : user.totpSecret;
  if (!secret) throw new AppError("No TOTP secret enrolled", 400);

  if (!verifyTotp(token, secret)) throw new AppError("Invalid code", 400);

  user.mfaEnabled = true;
  user.mfaMethod = "totp";
  await user.save();
  return true;
}

export async function sendMfaOtp({ userId, method = "email" }) {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);
  await createAndSendOtp({ user, method });
  return true;
}

export async function verifyMfaOtpEnroll({ userId, code }) {
  if (!code) throw new AppError("Code required", 400);
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const ok = await verifyUserOtp(user._id, code);
  if (!ok) throw new AppError("Invalid or expired code", 400);

  user.mfaEnabled = true;
  user.mfaMethod = user.mfaOtp?.method || "email";
  user.mfaOtp = undefined;
  await user.save();
  return true;
}

export async function mfaDisable({ userId }) {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  user.mfaEnabled = false;
  user.mfaMethod = null;
  user.totpSecret = undefined;
  user.backupCodes = [];
  user.mfaOtp = undefined;
  await user.save();
  return true;
}

/* ------------------------ Me ------------------------ */

export async function me({ userId }) {
  const user = await User.findById(userId).select(
    "email username role mfaEnabled"
  );
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    mfaEnabled: !!user.mfaEnabled,
  };
}

/* ------------------------ Utils ------------------------ */

function toUserDto(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    mfaEnabled: !!user.mfaEnabled,
    mfaMethod: user.mfaMethod || null,
  };
}
