import { Router } from "express";
import admin from "./admin/admin.route.js";
import authRoutes from "./auth/auth.route.js";
import socialRoutes from "./auth/social.route.js";
import userRoutes from "./user.route.js";
import profileRoutes from "./profile.route.js";
import uploadRoutes from "./upload.route.js";
import clientErrorRoutes from "./client-error.route.js";
import testErrorRoutes from "./test-error.route.js";

const router = Router();
router.use("/auth", authRoutes);
router.use("/auth/social", socialRoutes);
router.use("/admin", admin);
router.use("/users", userRoutes);
router.use("/profile", profileRoutes);
router.use("/uploads", uploadRoutes);
router.use("/logs/client-error", clientErrorRoutes);

// Test error routes (only in development)
if (process.env.NODE_ENV === "development") {
  router.use("/test-errors", testErrorRoutes);
}

export default router;
