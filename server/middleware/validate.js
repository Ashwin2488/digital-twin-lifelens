import { HttpError } from "./errors.js";

export function requireFields(source, fields) {
  return (req, _res, next) => {
    const body = source === "query" ? req.query : req.body || {};
    const missing = fields.filter((field) => {
      const value = body[field];
      return value == null || value === "";
    });
    if (missing.length) {
      throw new HttpError(400, "VALIDATION", `Missing required field(s): ${missing.join(", ")}.`, { missing });
    }
    next();
  };
}
