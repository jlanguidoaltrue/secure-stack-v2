import crypto from "crypto";
import AppError from "../utils/AppError.js";
import User from "../models/User.js";
import PasswordReset from "../models/PasswordReset.js";
import {
  issueTokens,
  refreshAccessToken,
  logout,
  registerUser,
  findUserByUsernameOrEmail,
  verifyPasswordOrLock,
  assertAccountUsable,
} from "../services/auth.service.js";
import {
  generateTotpSecret,
  verifyTotp,
  createBackupCodes,
} from "../services/totp.service.js";
import { transporter } from "../utils/mailer.js";

export const login = async (req, res, next) => {
  try {
    const { usernameOrEmail, password, mfaToken, backupCode } = req.body;
    const user = await findUserByUsernameOrEmail(usernameOrEmail);
    await assertAccountUsable(user);
    await verifyPasswordOrLock(user, password);

    if (user.mfaEnabled && user.mfaMethod === "totp") {
      if (!mfaToken && !backupCode) throw new AppError("MFA token required", 401);
      if (backupCode) {
        const hashed = crypto.createHash("sha256").update(backupCode).digest("hex");
        const idx = (user.backupCodes || []).indexOf(hashed);
        if (idx === -1) throw new AppError("Invalid backup code", 401);
        user.backupCodes.splice(idx, 1);
        await user.save();
      } else {
        const secret = user.getTotpSecret();
        if (!verifyTotp(mfaToken, secret)) throw new AppError("Invalid TOTP token", 401);
      }
    }

    const meta = { ip: req.ip, userAgent: req.get("User-Agent") || "" };
    const tokens = await issueTokens(user, meta);
    res.json({ data: { user: { id: user._id, username: user.username, email: user.email, role: user.role }, tokens } });
  } catch (e) { next(e); }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError("Refresh token required", 400);
    const meta = { ip: req.ip, userAgent: req.get("User-Agent") || "" };
    const tokens = await refreshAccessToken(refreshToken, meta);
    res.json({ data: tokens });
  } catch (e) { next(e); }
};

export const doLogout = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    await logout(userId);
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
};

export const register = async (req, res, next) => {
  try {
    const { username, email, password, tenantId, role } = req.body;
    const user = await registerUser({ username, email, password, tenantId, role });
    res.status(201).json({ data: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch (e) { next(e); }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user) return res.json({ data: { sent: true } });
    const raw = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await PasswordReset.create({ userId: user._id, tokenHash, expiresAt });
    const base = `${req.protocol}://${req.get("host")}`;
    const resetUrl = `${base}/api/auth/reset?token=${raw}&uid=${user._id}`;
    try {
      await transporter.sendMail({ to: user.email, subject: "Password reset", text: `Reset your password: ${resetUrl}`, html: `<p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p>` });
    } catch (e) { console.error("Failed sending reset email", e); }
    res.json({ data: { sent: true } });
  } catch (e) { next(e); }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { uid, token, password } = req.body;
    if (!uid || !token || !password) throw new AppError("Missing params", 400);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const pr = await PasswordReset.findOne({ userId: uid, tokenHash, used: false, expiresAt: { $gt: new Date() } });
    if (!pr) throw new AppError("Invalid or expired token", 400);
    const user = await User.findById(uid);
    if (!user) throw new AppError("User not found", 404);
    await user.setPassword(password);
    await user.save();
    pr.used = true; await pr.save();
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
};

export const mfaEnroll = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    const { type } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (type === "totp") {
      const label = `${process.env.APP_NAME || "App"} (${user.email || user.username})`;
      const secret = await generateTotpSecret(label);
      user.totpSecret = secret.base32;
      const backup = createBackupCodes(8);
      user.backupCodes = backup.map(c => crypto.createHash("sha256").update(c).digest("hex"));
      await user.save();
      return res.json({ data: { secret: secret.base32, qrDataUrl: secret.qrDataUrl, backupCodes: backup } });
    }
    if (type === "sms" || type === "email") { user.mfaMethod = type; await user.save(); return res.json({ data: { ok: true } }); }
    throw new AppError("Unsupported MFA type", 400);
  } catch (e) { next(e); }
};

export const mfaVerify = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    const { token } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);
    const secret = user.getTotpSecret();
    if (!secret) throw new AppError("No TOTP secret enrolled", 400);
    if (!verifyTotp(token, secret)) throw new AppError("Invalid code", 400);
    user.mfaEnabled = true; user.mfaMethod = "totp";
    await user.save();
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
};
