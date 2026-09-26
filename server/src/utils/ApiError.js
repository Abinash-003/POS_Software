/**
 * Errors carry a translation key (not a sentence) so the React client can render
 * the message in English or Tamil. Keys map to `errors.*` in the i18n bundles.
 */
export class ApiError extends Error {
  constructor(statusCode, code, details) {
    super(code);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(code = "invalidForm", details) {
    return new ApiError(400, code, details);
  }

  static unauthorized(code = "unauthorized") {
    return new ApiError(401, code);
  }

  static forbidden(code = "noPermission") {
    return new ApiError(403, code);
  }

  static notFound(code = "notFound") {
    return new ApiError(404, code);
  }

  static conflict(code, details) {
    return new ApiError(409, code, details);
  }

  static server(code = "server") {
    return new ApiError(500, code);
  }
}
