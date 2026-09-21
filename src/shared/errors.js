'use strict';

class AppError extends Error {
  constructor(code, message, status = 422, details) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function requireValue(condition, code, message, status = 422) {
  if (!condition) throw new AppError(code, message, status);
}

module.exports = { AppError, requireValue };
