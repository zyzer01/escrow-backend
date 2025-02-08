import { HttpError } from './HttpError';

export class GoneException extends HttpError {
  constructor(message: string = 'Gone Error') {
    super(message, 410);
  }
}
