import { HttpError } from './HttpError';

export class NotFoundException extends HttpError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
  }
}
