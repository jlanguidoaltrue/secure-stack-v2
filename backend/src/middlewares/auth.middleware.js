import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";
import { envVars } from "../config/envVars.js";

export default function auth(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return next(new AppError("Unauthorized", 401));
  try {
    const payload = jwt.verify(token, envVars.JWT_SECRET);
    req.user = payload; // { sub, email, role }
    next();
  } catch {
    next(new AppError("Unauthorized", 401));
  }
}
