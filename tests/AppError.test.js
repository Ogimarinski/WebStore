const AppError = require("../src/errors/AppError");

describe("AppError", () => {
    test("keeps status, message and options", () => {
        const error = new AppError(400, 'Invalid Page', {
            code: 'INVALID_QUERY_PARAMS',
            details: { param: 'page' }
        });

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
        expect(error.status).toBe(400);
        expect(error.message).toBe('Invalid Page');
        expect(error.code).toBe('INVALID_QUERY_PARAMS');
        expect(error.details).toStrictEqual({ param: 'page' });
    });

    test("works without options", () => {
        const error = new AppError(404, 'Endpoint not found');

        expect(error.status).toBe(404);
        expect(error.code).toBeUndefined();
        expect(error.details).toBeUndefined();
    });
});