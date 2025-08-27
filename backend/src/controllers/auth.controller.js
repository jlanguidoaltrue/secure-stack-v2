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
import { createAndSendOtp, verifyUserOtp } from "../services/otp.service.js";

export const login = async (req, res, next) => {
  try {
    const {
      usernameOrEmail = "",
      password = "",
    } = req.body;

    console.log("Login attempt for:", usernameOrEmail);

    const user = await findUserByUsernameOrEmail(usernameOrEmail);
    console.log("User found:", { id: user._id, isActive: user.isActive });

    await assertAccountUsable(user);
    await verifyPasswordOrLock(user, password);
    console.log("Password verified successfully");

    const meta = { 
      ip: req.ip, 
      userAgent: req.get("User-Agent") || "" 
    };

    const tokens = await issueTokens(user, meta);
    console.log("Tokens generated:", { 
      hasAccessToken: !!tokens.accessToken,
      hasRefreshToken: !!tokens.refreshToken 
    });

    res.json({
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          mfaEnabled: !!user.mfaEnabled,
          mfaMethod: user.mfaMethod || null,
        },
        tokens,
        mfaRequired: !!user.mfaEnabled,
        mfaEnrolled: !!user.mfaEnabled,
      },
    });
  } catch (e) {
    console.error("Login error:", e);
    next(e);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError("Refresh token required", 400);
    const meta = { ip: req.ip, userAgent: req.get("User-Agent") || "" };
    const tokens = await refreshAccessToken(refreshToken, meta);
    res.json({ data: tokens });
  } catch (e) {
    next(e);
  }
};

export const doLogout = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    await logout(userId);
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
};

export const register = async (req, res, next) => {
  try {
    const { username, email, password, tenantId, role } = req.body;
    const user = await registerUser({
      username,
      email,
      password,
      tenantId,
      role,
    });
    res.status(201).json({
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    next(e);
  }
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
      await transporter.sendMail({
        to: user.email,
        subject: "Password reset",
        text: `Reset your password: ${resetUrl}`,
        html: `<p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    } catch (e) {
      console.error("Failed sending reset email", e);
    }
    res.json({ data: { sent: true } });
  } catch (e) {
    next(e);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { uid, token, password } = req.body;
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
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
};

export const mfaEnroll = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    const { type, rotate = false } = req.body;

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

      // Service returns { secret: { base32 }, qrDataUrl, otpauth }
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

      return res.json({
        data: {
          secret,
          qrDataUrl,
          otpauth,
          backupCodes,
        },
      });
    }

    if (type === "email" || type === "sms") {
      user.mfaMethod = type;
      user.mfaEnabled = false;
      await user.save();
      return res.json({ data: { ok: true } });
    }

    throw new AppError("Unsupported MFA type", 400);
  } catch (e) {
    next(e);
  }
};

export const mfaVerify = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    const { token } = req.body;

    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const secret = user.getTotpSecret ? user.getTotpSecret() : user.totpSecret;
    if (!secret) throw new AppError("No TOTP secret enrolled", 400);

    if (!verifyTotp(token, secret)) throw new AppError("Invalid code", 400);

    user.mfaEnabled = true;
    user.mfaMethod = "totp";
    await user.save();

    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
};

export const sendMfaOtp = async (req, res, next) => {
  try {
    const { method = "email" } = req.body;
    console.log("Received OTP request:", { userId: req.user?.sub, method });

    // Get the full user record for the authenticated user
    let user = req.user ? await User.findById(req.user.sub) : null;

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user) {
      await createAndSendOtp({ user, method }); // hashes + TTL in user.mfaOtp
    }

    res.json({ data: { sent: true } });
  } catch (e) {
    next(e);
  }
};

export const verifyMfaOtpEnroll = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;

    const rawInput = (req.body?.code ?? req.body?.otp ?? "").toString().trim();
    if (!rawInput) throw new AppError("Code required", 400);

    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const ok = await verifyUserOtp(user._id, rawInput);
    if (!ok) throw new AppError("Invalid or expired code", 400);

    user.mfaEnabled = true;
    user.mfaMethod = user.mfaOtp?.method || "email";
    user.mfaOtp = undefined; // consume
    await user.save();

    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
};

export const mfaDisable = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    user.mfaEnabled = false;
    user.mfaMethod = null;
    user.totpSecret = undefined;
    user.backupCodes = [];
    user.mfaOtp = undefined;
    await user.save();

    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      "email username role mfaEnabled"
    );
    res.json({
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        mfaEnabled: !!user.mfaEnabled,
      },
    });
  } catch (e) {
    next(e);
  }
};
