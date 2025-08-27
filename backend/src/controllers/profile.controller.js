import User from "../models/User.js";
import AppError from "../utils/AppError.js";

export const me = async (req, res, next) => {
  try {
    const u = await User.findById(req.user.sub).select("-passwordHash").lean();
    if (!u) return next(new AppError("User not found", 404));
    res.json({ data: u });
  } catch (e) {
    next(e);
  }
};
export const updateMe = async (req, res, next) => {
  try {
    const patch = req.body || {};
    const allowed = ["firstName", "lastName", "bio", "email", "phone"]; // <-- add these
    const update = {};
    for (const k of allowed) if (patch[k] !== undefined) update[k] = patch[k];

    // optional: simple validation
    if (update.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(update.email)) {
      return next(new AppError("Invalid email", 400));
    }
    if (update.phone && !/^\+?[\d\s\-()]+$/.test(update.phone)) {
      return next(new AppError("Invalid phone", 400));
    }

    const u = await User.findByIdAndUpdate(req.user.sub, update, { new: true })
      .select("-passwordHash")
      .lean();
    res.json({ data: u });
  } catch (e) {
    next(e);
  }
};

export const updatePhoto = async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError("No file uploaded", 400));
    const url = `/uploads/${req.file.filename}`;
    const u = await User.findByIdAndUpdate(
      req.user.sub,
      { avatarUrl: url },
      { new: true }
    )
      .select("-passwordHash")
      .lean();
    res.json({ data: { avatarUrl: url, user: u } });
  } catch (e) {
    next(e);
  }
};
