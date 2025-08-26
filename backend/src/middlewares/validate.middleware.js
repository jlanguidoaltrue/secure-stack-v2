import AppError from "../utils/AppError.js";
export function validate(schema){
  return (req, _res, next) => {
    try{
      const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
      req.body = parsed.body || req.body;
      req.query = parsed.query || req.query;
      req.params = parsed.params || req.params;
      next();
    }catch(e){
      const msg = e.errors?.map?.(x=>x.message).join(", ") || "Validation error";
      next(new AppError(msg, 400));
    }
  }
}
