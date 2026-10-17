export class AppError extends Error {
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(message: string, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}
