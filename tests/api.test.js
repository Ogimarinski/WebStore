const { apiGet, ApiError } = require("../public/js/api.js");

beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'ok',
        json: async () => ({ items: [] })
    });
});

describe("apiGet", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe("request", () => {
        test("calls the path without a query when there are no params", async () => {
            await apiGet('/api/products');

            expect(fetch).toHaveBeenCalledWith('/api/products', {
                headers: { Accept: 'application/json' },
                signal: undefined
            });
        });

        test("adds the params as a query string", async () => {
            await apiGet('/api/products', { locale: 'bg', page: 2 });

            expect(fetch.mock.calls[0][0]).toBe('/api/products?locale=bg&page=2');
        });

        test("repeats a param for every item of an array", async () => {
            await apiGet('/api/products', { attributeValueId: [4, 9] });

            expect(fetch.mock.calls[0][0]).toBe('/api/products?attributeValueId=4&attributeValueId=9');
        });

        test("skips params that are undefined", async () => {
            await apiGet('/api/products', { locale: 'bg', page: undefined });

            expect(fetch.mock.calls[0][0]).toBe('/api/products?locale=bg');
        });

        test("encodes text in the query", async () => {
            await apiGet('/api/products', { search: 'яке 50%' });

            expect(fetch.mock.calls[0][0]).toBe('/api/products?search=%D1%8F%D0%BA%D0%B5+50%25');
        });

        test("passes the abort signal to fetch", async () => {
            const { signal } = new AbortController();

            await apiGet('/api/products', {}, { signal });

            expect(fetch.mock.calls[0][1].signal).toBe(signal);
        });
    });

    describe("response", () => {
        test("returns the body on success", async () => {
            const body = { items: [{ id: 1 }], total: 1 };

            fetch.mockResolvedValue({ ok: true, status: 200, statusText: 'ok', json: async () => body });

            const result = await apiGet('/api/products');

            expect(result).toStrictEqual(body);
        });

        test("throws ApiError with status, code, message from the error body", async () => {
            fetch.mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                json: async () => ({ error: { code: 'INVALID_QUERY_PARAM', message: 'Invalid page' } })
            });

            const request = apiGet('/api/products');

            await expect(request).rejects.toBeInstanceOf(ApiError);
            await expect(request).rejects.toMatchObject({
                status: 400,
                code: 'INVALID_QUERY_PARAM',
                message: 'Invalid page'
            });
        });

        test("falls back to INTERNAL_ERROR and statusText when the error body cannot be parsed", async () => {
            fetch.mockResolvedValue({
                ok: false,
                status: 502,
                statusText: 'Bad Gateway',
                json: async () => {
                    throw new SyntaxError('Unexpected token <');
                }
            });

            await expect(apiGet('/api/products')).rejects.toMatchObject({
                status: 502,
                code: 'INTERNAL_ERROR',
                message: 'Bad Gateway'
            });
        });

        test("passes network errors through", async () => {
            const error = new TypeError('Failed to fetch');
            fetch.mockRejectedValue(error);

            await expect(apiGet('/api/products')).rejects.toBe(error);
        });

    });
});