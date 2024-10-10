export class HttpError extends Error {
    public statusCode: number;
    public timestamp: string;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.timestamp = new Date().toISOString();

        // Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;
        // Capture the stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}
