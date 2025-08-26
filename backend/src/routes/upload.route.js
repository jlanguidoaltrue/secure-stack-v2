import express from "express";
import auth from "../middlewares/auth.middleware.js";
import { secureUpload } from "../middlewares/upload.middleware.js";
import { upload } from "../controllers/upload.controller.js";

const router = express.Router();

router.post("/", auth, secureUpload, upload);

export default router;
