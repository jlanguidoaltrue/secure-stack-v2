import express from "express";
import auth from "../middlewares/auth.middleware.js";
import { uploadSingle } from "../middlewares/upload.middleware.js";
import { me, updateMe, updatePhoto } from "../controllers/profile.controller.js";
const router = express.Router();
router.get("/me", auth, me);
router.patch("/me", auth, updateMe);
router.post("/me/photo", auth, (req, res, next)=>{
  uploadSingle(req, res, (err)=>{
    if (err) return next(err);
    updatePhoto(req, res, next);
  });
});
export default router;
