export const upload = async (req, res, next) => {
  try{
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({ data: { url, originalName: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } });
  }catch(e){ next(e); }
};
