// controllers/auth.controller.js
import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";
import { envVars } from "../config/envVars.js";
import * as authSvc from "../services/auth.service.js";

// Refresh cookie config
const REFRESH_COOKIE = "rt";
const refreshCookieOpts = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/api/auth/refresh",
};

function getSidFromRefreshCookie(req) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return null;
  try {
    const p = jwt.verify(token, envVars.JWT_REFRESH_SECRET, {
      issuer: envVars.JWT_ISSUER,
      audience: envVars.JWT_AUD,
    });
    return p.sid || null;
  } catch {
    return null;
  }
}

export const login = async (req, res, next) => {
  try {
    const { usernameOrEmail = "", password = "" } = req.body;
    const meta = { ip: req.ip, userAgent: req.get("User-Agent") || "" };

    const out = await authSvc.loginOrMfa({ usernameOrEmail, password, meta });

    if (out.mfaRequired) {
      return res.json({
        data: {
          user: out.user,
          mfaRequired: true,
          mfaToken: out.mfaToken,
        },
      });
    }

    // Set refresh cookie, return access only
    res.cookie(REFRESH_COOKIE, out.tokens.refreshToken, refreshCookieOpts);
    return res.json({
      data: {
        user: out.user,
        tokens: { accessToken: out.tokens.accessToken },
        mfaRequired: false,
        mfaEnrolled: out.user.mfaEnabled,
      },
    });
  } catch (e) {
    next(e);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken =
      req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    if (!refreshToken) throw new AppError("Refresh token required", 400);
    const meta = { ip: req.ip, userAgent: req.get("User-Agent") || "" };

    const { accessToken, refreshToken: nextRt } = await authSvc.rotate({
      refreshToken,
      meta,
    });

    if (nextRt) res.cookie(REFRESH_COOKIE, nextRt, refreshCookieOpts);
    res.json({ data: { accessToken } });
  } catch (e) {
    next(e);
  }
};

export const doLogout = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    let sid = req.user?.sid || getSidFromRefreshCookie(req);

    await authSvc.logoutAndRevoke({ userId, sid });

    res.clearCookie(REFRESH_COOKIE, refreshCookieOpts);
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
};

export const register = async (req, res, next) => {
  try {
    const { username, email, password, tenantId, role } = req.body;
    const user = await authSvc.registerUser({
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
    await authSvc.forgotPasswordFlow({
      email,
      baseUrl: `${req.protocol}://${req.get("host")}`,
    });
    res.json({ data: { sent: true } });
  } catch (e) {
    next(e);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { uid, token, password } = req.body;
    await authSvc.resetPasswordFlow({ uid, token, password });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
};

export const mfaEnroll = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    const out = await authSvc.mfaEnroll({
      userId,
      type: req.body.type,
      rotate: !!req.body.rotate,
    });
    res.json({ data: out });
  } catch (e) {
    next(e);
  }
};

export const mfaVerify = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    await authSvc.mfaVerify({ userId, token: req.body.token });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
};

export const sendMfaOtp = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    await authSvc.sendMfaOtp({ userId, method: req.body?.method || "email" });
    res.json({ data: { sent: true } });
  } catch (e) {
    next(e);
  }
};

export const verifyMfaOtpEnroll = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    const code = (req.body?.code ?? req.body?.otp ?? "").toString().trim();
    await authSvc.verifyMfaOtpEnroll({ userId, code });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
};

export const mfaDisable = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    await authSvc.mfaDisable({ userId });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
};

export const me = async (req, res, next) => {
  try {
    const data = await authSvc.me({ userId: req.user.id });
    res.json({ data });
  } catch (e) {
    next(e);
  }
};
