import { HttpError } from './HttpError';

export class UnprocessableEntityException extends HttpError {
  constructor(message: string = 'Unprocessable Entity Error') {
    super(message, 422);
  }
}
