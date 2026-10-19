jest.mock('../src/repositories/product.repository');

const { PAGE_SIZE } = require('../src/config/catalog');
const productRepository = require('../src/repositories/product.repository');
const { getPublishedProducts } = require('../src/services/product.service');

describe("getPublishedProducts", () => {
    const baseInput = { locale: 'bg', sort: 'newest', page: 1, filters: {} };

    beforeEach(() => {
        jest.clearAllMocks();
        productRepository.countPublishedProducts.mockResolvedValue(0);
        productRepository.findPublishedProducts.mockResolvedValue([]);
    });

    describe("repository calls", () => {
        test.each([
            [1, 0],
            [2, PAGE_SIZE],
            [3, 2 * PAGE_SIZE]
        ])("page %i uses offset %i and limit PAGE_SIZE", async (page, offset) => {
            await getPublishedProducts({ ...baseInput, page });

            expect(productRepository.findPublishedProducts).toHaveBeenCalledWith(
                expect.objectContaining({ limit: PAGE_SIZE, offset })
            );
        });

        test("passes the sort to findPublishedProducts", async () => {
            await getPublishedProducts({ ...baseInput, sort: 'price_asc' });

            expect(productRepository.findPublishedProducts).toHaveBeenCalledWith(
                expect.objectContaining({ sort: 'price_asc' })
            );
        });

        test("passes the same criteria to findPublishedProducts and countPublishedProducts", async () => {

            const filters = { mainCategoryId: 1, minPriceCents: 120, search: 'text' };

            await getPublishedProducts({ ...baseInput, filters });

            const { criteria } = productRepository.findPublishedProducts.mock.calls[0][0];
            const countCriteria = productRepository.countPublishedProducts.mock.calls[0][0];

            expect(criteria).toStrictEqual(countCriteria);
        });

        test("passes the filters to the repository as criteria", async () => {
            await getPublishedProducts({ ...baseInput, locale: 'en', filters: { mainCategoryId: 1, subCategoryId: 3, attributeValueIds: [1, 2], search: 'text' } });

            const { criteria } = productRepository.findPublishedProducts.mock.calls[0][0];

            expect(criteria).toStrictEqual({
                locale: 'en',
                mainCategoryId: 1,
                subCategoryId: 3,
                minNetCents: undefined,
                maxNetCents: undefined,
                attributeValueIds: [1, 2],
                search: 'text'
            });
        });
    });

    describe("criteria", () => {

        test("passes locale, categories, attribute values and search unchanged", async () => {

            await getPublishedProducts({ ...baseInput, locale: 'en', filters: { mainCategoryId: 1, attributeValueIds: [1, 2], search: 'text' } });

            const { criteria } = productRepository.findPublishedProducts.mock.calls[0][0];

            expect(criteria).toEqual(expect.objectContaining({ locale: 'en', mainCategoryId: 1, attributeValueIds: [1, 2], search: 'text' }));
        });

        test("leaves price bounds undefined when no price filter is given", async () => {

            await getPublishedProducts({ ...baseInput });

            const { criteria } = productRepository.findPublishedProducts.mock.calls[0][0];

            expect(criteria.minNetCents).toBeUndefined();
            expect(criteria.maxNetCents).toBeUndefined();
        });

        test.each([
            [0, 0, 0],
            [120, 100, 100],
            [121, 101, 101],
            [123, 103, 102]
        ])("gross %i gives minNetCents %i and maxNetCents %i", async (gross, minNetCents, maxNetCents) => {

            await getPublishedProducts({ ...baseInput, filters: { minPriceCents: gross, maxPriceCents: gross } });

            const criteria = productRepository.countPublishedProducts.mock.calls[0][0];

            expect(criteria.minNetCents).toBe(minNetCents);
            expect(criteria.maxNetCents).toBe(maxNetCents);
        });
    });

    describe("results", () => {

        test("returns the total and one item per row", async () => {
            productRepository.countPublishedProducts.mockResolvedValue(30);
            productRepository.findPublishedProducts.mockResolvedValue([{ id: '1', product: 'Product1', price_cents: 1000 }, { id: '2', product: 'Product2', price_cents: 1200 }]);

            const result = await getPublishedProducts({ ...baseInput });

            expect(result.total).toBe(30);
            expect(result.items).toHaveLength(2);
        });

        test("returns an empty list when there are no products", async () => {

            const result = await getPublishedProducts({ ...baseInput });

            expect(result).toStrictEqual({ items: [], total: 0 });

        });

        test("maps a database row to a product", async () => {
            productRepository.findPublishedProducts.mockResolvedValue([{ id: '1', name: 'Product1', short_description: 'short', price_cents: 1000, image_path: '/path', quantity: 3 }]);

            const result = await getPublishedProducts({ ...baseInput });

            expect(result.items).toStrictEqual([{
                id: 1,
                name: 'Product1',
                shortDescription: 'short',
                priceCents: 1000,
                vatCents: 200,
                totalCents: 1200,
                currency: 'EUR',
                vatRate: 20,
                image: '/path',
                inStock: true
            }]);
        });

        test.each([
            [1000, 200, 1200],
            [3, 1, 4],
            [2, 0, 2]
        ])("net %i gives vatCents %i and totalCents %i", async (priceCents, vatCents, totalCents) => {
            productRepository.findPublishedProducts.mockResolvedValue([{ id: '1', price_cents: priceCents }]);

            const result = await getPublishedProducts(baseInput);

            expect(result.items[0]).toEqual(expect.objectContaining({ vatCents, totalCents }));
        });

        test.each([
            [0, false],
            [1, true]
        ])("quantity %i gives inStock %s", async (quantity, inStock) => {
            productRepository.findPublishedProducts.mockResolvedValue([{ id: '1', price_cents: 1000, quantity }]);

            const result = await getPublishedProducts(baseInput);

            expect(result.items[0].inStock).toBe(inStock);
        });

        test("converts min and max price independently", async () => {
            await getPublishedProducts({ ...baseInput, filters: { minPriceCents: 120, maxPriceCents: 7199 } });

            const criteria = productRepository.countPublishedProducts.mock.calls[0][0];

            expect(criteria.minNetCents).toBe(100);
            expect(criteria.maxNetCents).toBe(5999);
        });
    });

    describe("errors", () => {

        test.each([
            ['findPublishedProducts'],
            ['countPublishedProducts']
        ])("rejects with error from %s", async (func) => {
            const error = new Error('boom');
            productRepository[func].mockRejectedValue(error);

            await expect(getPublishedProducts({ ...baseInput })).rejects.toBe(error);
        });

        test.each([
            ['minPriceCents', -1],
            ['minPriceCents', NaN],
            ['maxPriceCents', Infinity],
            ['maxPriceCents', 10.5]
        ])("rejects when %s is %p", async (field, value) => {
            await expect(getPublishedProducts({ ...baseInput, filters: { [field]: value } }))
                .rejects.toThrow('grossCents must be a non-negative integer');

            expect(productRepository.findPublishedProducts).not.toHaveBeenCalled();
            expect(productRepository.countPublishedProducts).not.toHaveBeenCalled();
        });

        test.each([
            [-100],
            ['1000'],
            [null]
        ])("rejects when a row has price_cents %p", async (priceCents) => {
            productRepository.findPublishedProducts.mockResolvedValue([{ id: '1', name: 'Product1', price_cents: priceCents, short_description: 'short', image_path: '/path', quantity: '2' }]);

            await expect(getPublishedProducts(baseInput))
                .rejects.toThrow('netCents must be a non-negative integer');
        });
    });
});