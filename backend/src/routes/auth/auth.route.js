import express from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import auth from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import rateLimit from "express-rate-limit";
import * as authCtrl from "../../controllers/auth.controller.js";
import {
  loginSchema,
  refreshSchema,
  registerSchema,
} from "../../schemas/auth.schema.js";
import { requireMfa } from "../../middlewares/requireMfa.middleware.js"; // <-- NEW

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", loginLimiter, validate(loginSchema), authCtrl.login);
router.post("/refresh", validate(refreshSchema), authCtrl.refresh);
router.post("/forgot", authCtrl.forgotPassword);
router.post("/reset", authCtrl.resetPassword);

router.post("/mfa/enroll", auth, authCtrl.mfaEnroll);
router.post("/mfa/verify", auth, authCtrl.mfaVerify);
router.post("/mfa/otp/send", auth, authCtrl.sendMfaOtp);
router.post("/mfa/otp/verify", auth, authCtrl.verifyMfaOtpEnroll);
router.post("/mfa/disable", auth, authCtrl.mfaDisable);

router.post("/logout", auth, authCtrl.doLogout);

router.post(
  "/register",
  auth,
  requireMfa,
  authorize("superadmin", "tenant_admin"),
  validate(registerSchema),
  authCtrl.register
);

export default router;
