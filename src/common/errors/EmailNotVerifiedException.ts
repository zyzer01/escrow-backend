import { HttpError } from './HttpError';

export class EmailNotVerifiedException extends HttpError {
  constructor(message: string = 'Email Not Verified') {
    super(message, 403);
  }
}
