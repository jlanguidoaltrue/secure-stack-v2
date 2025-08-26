import AppError from "../utils/AppError.js";
export function authorize(...allowed){
  return (req, _res, next) => {
    if (!req.user) return next(new AppError("Unauthorized", 401));
    if (allowed.length && !allowed.includes(req.user.role)) return next(new AppError("Forbidden", 403));
    next();
  };
}
