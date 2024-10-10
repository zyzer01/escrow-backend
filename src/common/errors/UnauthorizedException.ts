import { HttpError } from './HttpError';

export class UnauthorizedException extends HttpError {
  constructor(message: string = 'Unauthorized Error') {
    super(message, 401);
  }
}
