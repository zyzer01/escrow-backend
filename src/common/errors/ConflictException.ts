import { HttpError } from './HttpError';

export class ConflictException extends HttpError {
  constructor(message: string = 'Conflict Error') {
    super(message, 409);
  }
}
