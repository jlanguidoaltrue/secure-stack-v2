import express from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import auth from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import rateLimit from "express-rate-limit";
import * as authCtrl from "../../controllers/auth.controller.js";
import { loginSchema, refreshSchema, registerSchema } from "../../schemas/auth.schema.js";

const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.post("/login", loginLimiter, validate(loginSchema), authCtrl.login);
router.post("/refresh", validate(refreshSchema), authCtrl.refresh);
router.post("/logout", auth, authCtrl.doLogout);
router.post("/register", auth, authorize("superadmin","tenant_admin"), validate(registerSchema), authCtrl.register);
router.post("/forgot", authCtrl.forgotPassword);
router.post("/reset", authCtrl.resetPassword);
router.post("/mfa/enroll", auth, authCtrl.mfaEnroll);
router.post("/mfa/verify", auth, authCtrl.mfaVerify);

export default router;
