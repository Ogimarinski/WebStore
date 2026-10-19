const errorHandler = require("../src/middleware/errorHandler");
const AppError = require("../src/errors/AppError");

function createRes({ headersSent = false } = {}) {
    const res = { headersSent };
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => { });
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe("errorHandler", () => {
    describe("4xx errors", () => {
        test("sends code, message and details of an AppError", () => {
            const res = createRes();
            const error = new AppError(400, 'Invalid "page"', {
                code: 'INVALID_QUERY_PARAM',
                details: { param: 'page' }
            });

            errorHandler(error, {}, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'INVALID_QUERY_PARAM',
                    message: 'Invalid "page"',
                    details: { param: 'page' }
                }
            });
        });

        test.each([
            [400, 'BAD_REQUEST'],
            [401, 'UNAUTHORIZED'],
            [403, 'FORBIDDEN'],
            [404, 'NOT_FOUND'],
            [409, 'CONFLICT']
        ])("AppError %i without code gets default code %s", (status, code) => {
            const res = createRes();

            errorHandler(new AppError(status, 'errorMsg'), {}, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(status);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code,
                    message: 'errorMsg'
                }
            });
        });

        test("uses BAD_REQUEST for a 4xx error without default code", () => {
            const res = createRes();

            errorHandler(new AppError(410, 'errorMsg'), {}, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(410);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'BAD_REQUEST',
                    message: 'errorMsg'
                }
            });
        });

        test("does not trust code and details from errors that are not AppError", () => {
            const res = createRes();
            const error = Object.assign(new Error('errorMsg'), {
                status: 400,
                code: 'fail',
                details: {}
            });

            errorHandler(error, {}, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'BAD_REQUEST',
                    message: 'errorMsg'
                }
            });
        });

        test("does not log 4xx errors", () => {
            errorHandler(new AppError(404, 'Not found'), {}, createRes(), jest.fn());

            expect(console.error).not.toHaveBeenCalled();
        });
    });

    describe("5xx errors", () => {
        test("hides the real message behind INTERNAL_ERROR", () => {
            const res = createRes();
            const error = new Error('relation "products" does not exist');

            errorHandler(error, {}, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
            });
        });

        test("logs the real error", () => {
            const error = new Error('DB is down');

            errorHandler(error, {}, createRes(), jest.fn());

            expect(console.error).toHaveBeenCalledWith(error);
        });

        test("hides the code of an AppError with a 5xx status", () => {
            const res = createRes();

            errorHandler(new AppError(503, 'Database unavailable', { code: 'DB_DOWN' }), {}, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.json).toHaveBeenCalledWith({
                error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
            });
        });

        test.each([
            ['missing', undefined],
            ['not an error status', 200],
            ['out of range', 700],
            ['not an integer', '400']
        ])("status %s → 500", (_, status) => {
            const res = createRes();
            const error = Object.assign(new Error('Boom'), { status });

            errorHandler(error, {}, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    test("passes the error to Express when headers are already sent", () => {
        const res = createRes({ headersSent: true });
        const next = jest.fn();
        const error = new Error('Stream broke');

        errorHandler(error, {}, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });
});