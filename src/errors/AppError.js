class AppError extends Error {
    constructor(status, message, options = {}) {
        super(message, options);
        this.status = status;
        this.code = options.code;
        this.details = options.details;
    }
}

module.exports = AppError;