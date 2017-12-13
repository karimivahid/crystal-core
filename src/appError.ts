export default class AppError extends Error{
  status: number;
  isOperationalError: boolean;
  originalMessage:string;
  code: number;
  errors: any[];
  constructor(message: string, status: number, originalMessage?: string, code?: number, errors?: any) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    this.status = status || 500;
    this.isOperationalError = true;
    this.originalMessage = originalMessage;
    this.code = code;
    this.errors = errors;
  }
};