export default class AppError extends Error {
  status: number;
  isOperationalError: boolean;
  originalMessage: string;
  errors: any[];
  constructor(message: string, status: number, errors: any) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    this.status = status || 500;
    this.isOperationalError = true;
    this.errors = errors;
  }
};