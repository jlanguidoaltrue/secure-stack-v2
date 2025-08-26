import express from "express";
import auth from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { 
  listLogs, 
  listErrorLogs, 
  resolveErrorLog, 
  getErrorLogStats 
} from "../../controllers/admin.controller.js";

const router = express.Router();

// Audit logs
router.get("/logs", auth, authorize("superadmin","tenant_admin"), listLogs);

// Error logs
router.get("/error-logs", auth, authorize("superadmin","tenant_admin"), listErrorLogs);
router.get("/error-logs/stats", auth, authorize("superadmin","tenant_admin"), getErrorLogStats);
router.patch("/error-logs/:id/resolve", auth, authorize("superadmin","tenant_admin"), resolveErrorLog);

export default router;
