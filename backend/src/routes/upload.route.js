import express from "express";
import auth from "../middlewares/auth.middleware.js";
import { uploadSingle } from "../middlewares/upload.middleware.js";
import {
  upload,
  listUploads,
  deleteUpload,
} from "../controllers/upload.controller.js";

const router = express.Router();

router.get("/", auth, listUploads);

router.post("/", auth, (req, res, next) => {
  uploadSingle(req, res, (err) => (err ? next(err) : upload(req, res, next)));
});

router.delete("/:id", auth, deleteUpload);

export default router;
