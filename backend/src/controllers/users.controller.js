import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import bcrypt from "bcryptjs";

function canAdmin(role){ return role === "superadmin" || role === "tenant_admin"; }

export const listUsers = async (req, res, next) => {
  try{
    if (!canAdmin(req.user.role)) return next(new AppError("Forbidden", 403));
    const users = await User.find({}).select("-passwordHash").lean();
    res.json({ data: users });
  }catch(e){ next(e); }
};

export const getUser = async (req, res, next) => {
  try{
    const id = req.params.id;
    const me = req.user;
    if (!canAdmin(me.role) && me.sub !== id) return next(new AppError("Forbidden", 403));
    const user = await User.findById(id).select("-passwordHash").lean();
    if (!user) return next(new AppError("Not found", 404));
    res.json({ data: user });
  }catch(e){ next(e); }
};

export const createUser = async (req, res, next) => {
  try{
    if (!canAdmin(req.user.role)) return next(new AppError("Forbidden", 403));
    const { email, username, password, role = "user" } = req.body;
    const user = new User({ email: email.toLowerCase(), username, role });
    if (password) user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    res.status(201).json({ data: { id: user._id, email: user.email, username: user.username, role: user.role } });
  }catch(e){ next(e); }
};

export const updateUser = async (req, res, next) => {
  try{
    const id = req.params.id;
    const me = req.user;
    const patch = req.body;
    const allowedSelf = ["username","firstName","lastName","bio"];
    const allowedAdmin = ["username","email","role","isActive","firstName","lastName","bio","avatarUrl"];
    const allowed = (me.sub === id && !["superadmin","tenant_admin"].includes(me.role)) ? allowedSelf : allowedAdmin;
    const update = {};
    for (const k of allowed){ if (patch[k] !== undefined) update[k] = k === "email" ? patch[k].toLowerCase() : patch[k]; }
    if (patch.password && (me.sub === id || ["superadmin","tenant_admin"].includes(me.role))) update.passwordHash = await bcrypt.hash(patch.password, 10);
    const user = await User.findByIdAndUpdate(id, update, { new: true }).select("-passwordHash").lean();
    if (!user) return next(new AppError("Not found", 404));
    res.json({ data: user });
  }catch(e){ next(e); }
};

export const deleteUser = async (req, res, next) => {
  try{
    if (!canAdmin(req.user.role)) return next(new AppError("Forbidden", 403));
    await User.findByIdAndDelete(req.params.id);
    res.json({ data: { ok: true } });
  }catch(e){ next(e); }
};
