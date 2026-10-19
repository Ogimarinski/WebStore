const AppError = require('../errors/AppError');

const DEFAULT_CODES = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT'
};

function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    const status = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599
        ? err.status
        : 500;

    if (status >= 500) {
        console.error(err);

        return res.status(status).json({
            error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
        });
    }

    const error = {
        code: (err instanceof AppError && err.code) || DEFAULT_CODES[status] || 'BAD_REQUEST',
        message: err.message
    };

    if (err instanceof AppError && err.details !== undefined) {
        error.details = err.details;
    }

    res.status(status).json({ error });
}

module.exports = errorHandler;