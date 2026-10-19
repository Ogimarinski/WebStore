jest.mock("../src/services/product.service");

const { getProducts } = require("../src/controllers/product.controller");
const productService = require("../src/services/product.service");
const {
    MAX_PAGE,
    MAX_PRICE_CENTS,
    MAX_ATTRIBUTE_VALUE_ID,
    MAX_ATTRIBUTE_VALUES,
    SEARCH_MIN_LENGTH,
    SEARCH_MAX_LENGTH,
    DEFAULT_LOCALE,
    DEFAULT_SORT,
    PAGE_SIZE
} = require('../src/config/catalog');
const { invalidParam } = require("../src/validators/queryParams");


const res = { json: jest.fn() };

const defaultParams = {
    locale: DEFAULT_LOCALE,
    sort: DEFAULT_SORT,
    page: 1,
    filters: {
        mainCategoryId: undefined,
        subCategoryId: undefined,
        minPriceCents: undefined,
        maxPriceCents: undefined,
        attributeValueIds: undefined,
        search: undefined
    }
};

describe("getProducts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        productService.getPublishedProducts.mockResolvedValue({ items: [], total: 0 });
    });
    describe("defaults", () => {

        test.each([
            ["locale"],
            ["sort"],
            ["page"],
            ["filters"]
        ])("use default %s when there is no input", async (param) => {

            await getProducts({ query: {} }, res);

            const call = productService.getPublishedProducts.mock.calls[0][0];

            expect(call[param]).toStrictEqual(defaultParams[param]);
        });
    });

    describe("parsing valid input", () => {

        test.each([
            ['locale', 'en', 'en'],
            ['sort', 'price_asc', 'price_asc'],
            ['page', '2', 2]
        ])("parse %s correctly", async (input, value, parsed) => {

            await getProducts({ query: { [input]: value } }, res);

            const call = productService.getPublishedProducts.mock.calls[0][0];

            expect(call[input]).toStrictEqual(parsed);
        });

        test.each([
            ['mainCategoryId', '1', 'mainCategoryId', 1],
            ['subCategoryId', '3', 'subCategoryId', 3],
            ['minPriceCents', '0', 'minPriceCents', 0],
            ['maxPriceCents', '7199', 'maxPriceCents', 7199],
            ['attributeValueId', '4', 'attributeValueIds', [4]],
            ['attributeValueId', ['4', '9', '4'], 'attributeValueIds', [4, 9]],
            ['search', '  яке ', 'search', 'яке']
        ])("parses query param %s=%p as filters.%s = %p", async (param, value, filter, expected) => {
            await getProducts({ query: { [param]: value } }, res);

            const { filters } = productService.getPublishedProducts.mock.calls[0][0];

            expect(filters[filter]).toStrictEqual(expected);
        });
    });

    describe("rejecting invalid input", () => {

        test.each([
            ['password', { password: 'abc123' }],
            ['sort', { sort: 'latest' }],
            ['page', { page: '0' }],
            ['page', { page: String(MAX_PAGE + 1) }],
            ['minPriceCents', { minPriceCents: String(MAX_PRICE_CENTS + 1) }],
            ['maxPriceCents', { maxPriceCents: String(MAX_PRICE_CENTS + 1) }],
            ['maxPriceCents', { minPriceCents: '1000', maxPriceCents: '900' }],
            ['attributeValueId', { attributeValueId: String(MAX_ATTRIBUTE_VALUE_ID + 1) }],
            ['attributeValueId', { attributeValueId: Array.from({ length: MAX_ATTRIBUTE_VALUES + 1 }, (_, i) => String(i + 1)) }],
            ['search', { search: 'a'.repeat(SEARCH_MIN_LENGTH - 1) }],
            ['search', { search: 'a'.repeat(SEARCH_MAX_LENGTH + 1) }]
        ])("rejects invalid %s: %p", async (param, query) => {
            await expect(getProducts({ query }, res)).rejects.toMatchObject({
                status: 400,
                code: 'INVALID_QUERY_PARAM',
                details: { param }
            });

            expect(productService.getPublishedProducts).not.toHaveBeenCalled();
        });

        test("rejects invalid min/maxPriceCents", async () => {
            await expect(getProducts({ query: { minPriceCents: '1000', maxPriceCents: '900' } }, res)).rejects.toThrow(invalidParam('maxPriceCents', 'must be greater or equal to minPriceCents'));
        });
    });

    describe("response", () => {
        const items = [{ id: 1, name: 'Product1' }, { id: 2, name: 'Product2' }];

        test("return correct json", async () => {
            productService.getPublishedProducts.mockResolvedValue({ items, total: 2 });

            await getProducts({ query: {} }, res);

            expect(res.json).toHaveBeenCalledWith({ items, page: 1, pageSize: PAGE_SIZE, total: 2, totalPages: 1 });
        });

        test.each([
            [0, 0],
            [1, 1],
            [21, 2],
            [40, 2],
            [10000, 500]
        ])("calculate totalPages with %i total and %i page size", async (total, totalPages) => {
            productService.getPublishedProducts.mockResolvedValue({ items, total });

            await getProducts({ query: {} }, res);

            expect(res.json).toHaveBeenCalledWith({ items, page: 1, pageSize: PAGE_SIZE, total, totalPages })
        });
    });

    describe("errors from service", () => {
        test("rejects with error from getPublishedProducts", async () => {
            const error = new Error('boom');

            productService.getPublishedProducts.mockRejectedValue(error);

            await expect(getProducts({ query: {} }, res)).rejects.toThrow(error);

            expect(res.json).not.toHaveBeenCalled();
        });
    });
});