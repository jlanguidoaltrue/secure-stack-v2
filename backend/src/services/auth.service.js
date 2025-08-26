import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";
import { envVars } from "../config/envVars.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";

export async function issueTokens(user, meta={}){
  const payload = { sub: String(user._id), email: user.email, role: user.role || "user" };
  const accessToken = jwt.sign(payload, envVars.JWT_SECRET, { expiresIn: envVars.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ sub: payload.sub, tokenUse: "refresh" }, envVars.JWT_REFRESH_SECRET, { expiresIn: envVars.REFRESH_EXPIRES_IN });
  await AuditLog.create({ userId: user._id, action: "login", meta, ip: meta.ip, userAgent: meta.userAgent, tenantId: user.tenantId });
  return { accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken, meta={}){
  try{
    const decoded = jwt.verify(refreshToken, envVars.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) throw new AppError("Invalid refresh", 401);
    return issueTokens(user, meta);
  } catch {
    throw new AppError("Invalid refresh", 401);
  }
}

export async function logout(userId){
  await AuditLog.create({ userId, action: "logout" });
  return { ok: true };
}

export async function registerUser({ username, email, password, tenantId=null, role="user" }){
  const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
  if (exists) throw new AppError("User already exists", 409);
  const user = new User({ username, email: email.toLowerCase(), role, tenantId });
  if (password) await user.setPassword(password);
  await user.save();
  return user;
}

export async function findUserByUsernameOrEmail(usernameOrEmail){
  const q = { $or: [{ email: (usernameOrEmail || "").toLowerCase() }, { username: usernameOrEmail }] };
  const user = await User.findOne(q);
  if (!user) throw new AppError("Invalid credentials", 401);
  return user;
}

export async function verifyPasswordOrLock(user, password){
  if (user.isLocked) throw new AppError("Account locked. Try later.", 423);
  const ok = await user.checkPassword(password);
  if (!ok){
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5){
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw new AppError("Invalid credentials", 401);
  }
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();
}

export async function assertAccountUsable(user){
  if (!user.isActive) throw new AppError("Account disabled", 403);
}
