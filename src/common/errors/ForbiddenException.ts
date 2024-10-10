import { HttpError } from './HttpError';

export class ForbiddenException extends HttpError {
  constructor(message: string = 'Forbidden Error') {
    super(message, 403);
  }
}
