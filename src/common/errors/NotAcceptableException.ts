import { HttpError } from './HttpError';

export class NotAcceptableException extends HttpError {
  constructor(message: string = 'Not Acceptable Error') {
    super(message, 406);
  }
}
