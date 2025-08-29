import express from "express";
import auth from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createUserSchema, updateUserSchema } from "../schemas/users.schema.js";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/users.controller.js";

const router = express.Router();
router.get("/me", auth, (req, res) => {
  const { sub, email, role } = req.user;
  res.json({ data: { id: sub, email, role } });
});
router.get("/", auth, authorize("superadmin", "tenant_admin"), listUsers);
router.post(
  "/",
  auth,
  authorize("superadmin", "tenant_admin"),
  validate(createUserSchema),
  createUser
);
router.get("/:id", auth, getUser);
router.patch("/:id", auth, validate(updateUserSchema), updateUser);
router.delete(
  "/:id",
  auth,
  authorize("superadmin", "tenant_admin"),
  deleteUser
);

export default router;
