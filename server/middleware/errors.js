export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function ok(res, data, meta, status = 200) {
  const body = meta ? { data, meta } : { data };
  return res.status(status).json(body);
}

export function fail(res, status, code, message, details) {
  return res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}

export function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function notFound(_req, res) {
  return fail(res, 404, "NOT_FOUND", "Not found.");
}

export function errorHandler(err, _req, res, next) {
  if (res.headersSent) return next(err);
  if (err?.type === "entity.too.large") {
    return fail(res, 413, "PAYLOAD_TOO_LARGE", "Request too large. Cap is 120kb.");
  }
  if (err instanceof HttpError) {
    return fail(res, err.status, err.code, err.message, err.details);
  }
  if (err?.status && err?.message) {
    return fail(res, err.status, err.code || "REQUEST_FAILED", err.message);
  }
  console.error(err);
  return fail(res, 500, "INTERNAL", err instanceof Error ? err.message : "Internal server error.");
}
