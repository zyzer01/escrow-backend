class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

class AlreadyDoneError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AlreadyDoneError";
    }
}

class InvalidStateError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidStateError";
    }
}

class TransactionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TransactionError";
    }
}

class InsufficientError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InsufficientError';
    }
}

class MissingIdError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MissingIdError';
    }
}

class InvalidAssignmentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidAssignmentError";
    }
}

class PendingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "PendingError";
    }
}

class NotImplementedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NotImplementedError";
    }
}
