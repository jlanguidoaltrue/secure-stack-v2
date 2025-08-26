import UploadFile from "../models/UploadFile.js";
import AppError from "../utils/AppError.js";

export const upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const url = `/uploads/${req.file.filename}`;
    const doc = await UploadFile.create({
      ownerId: req.user?.sub,
      originalName: req.file.originalname,
      url,
      path:
        req.file.path || path.join(process.cwd(), "uploads", req.file.filename),
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    res.status(201).json({ data: doc });
  } catch (e) {
    next(e);
  }
};

export const listUploads = async (req, res, next) => {
  try {
    const isAdmin = ["superadmin", "tenant_admin"].includes(req.user?.role);
    const q = isAdmin && req.query.all === "1" ? {} : { ownerId: req.user.sub };
    const files = await UploadFile.find(q).sort({ createdAt: -1 }).lean();
    res.json({ data: files });
  } catch (e) {
    next(e);
  }
};

export const deleteUpload = async (req, res, next) => {
  try {
    const doc = await UploadFile.findById(req.params.id);
    if (!doc) throw new AppError("Not found", 404);

    const isAdmin = ["superadmin", "tenant_admin"].includes(req.user?.role);
    if (!isAdmin && String(doc.ownerId) !== req.user.sub) {
      throw new AppError("Forbidden", 403);
    }

    // Best-effort delete from disk
    try {
      await fs.unlink(doc.path);
    } catch {}
    await doc.deleteOne();

    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
};
