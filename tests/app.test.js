jest.mock('../src/services/product.service');

const request = require('supertest');
const app = require('../src/app');
const productService = require('../src/services/product.service');

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe("app", () => {
    test("GET /api/products returns the products from the service", async () => {
        productService.getPublishedProducts.mockResolvedValue({ items: [{ id: 1, name: 'Яке Rain' }], total: 1 });

        const response = await request(app).get('/api/products');

        expect(response.status).toBe(200);
        expect(response.body.items).toStrictEqual([{ id: 1, name: 'Яке Rain' }]);
    });

    test("returns 404 JSON for an unknown API path", async () => {
        const response = await request(app).get('/api/unknown');

        expect(response.status).toBe(404);
        expect(response.body).toStrictEqual({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
    });

    test("returns 500 JSON without internal details when loading fails", async () => {
        const error = new Error('connection refused');
        productService.getPublishedProducts.mockRejectedValue(error);
        jest.spyOn(console, 'error').mockImplementation(() => { });

        const response = await request(app).get('/api/products');

        expect(response.status).toBe(500);
        expect(response.body).toStrictEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
        expect(console.error).toHaveBeenCalledWith(error);
    });
});