jest.mock('../src/db/pool', () => ({ query: jest.fn() }));

const pool = require("../src/db/pool");
const { countPublishedProducts, findPublishedProducts } = require('../src/repositories/product.repository');

beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockResolvedValue({ rows: [{ total: '0' }] });
});

describe("countPublishedProducts", () => {
    test("return the total as a Number", async () => {
        pool.query.mockResolvedValue({ rows: [{ total: '10' }] });

        const total = await countPublishedProducts({ locale: 'bg' });

        expect(total).toBe(10);
    });

    test("without filters uses only the locale", async () => {
        await countPublishedProducts({ locale: 'bg' });

        const params = pool.query.mock.calls[0][1];

        expect(params).toStrictEqual(['bg']);
    });

    test("counts only published products from active categories with a main image", async () => {
        await countPublishedProducts({ locale: 'bg' });

        const [sql] = pool.query.mock.calls[0];

        expect(sql).toContain("p.status = 'published'");
        expect(sql).toContain('s.is_active');
        expect(sql).toContain('mc.is_active');
        expect(sql).toContain('img.sort_order = 1');
    });

    test.each([
        ['50%', '%50\\%%'],
        ['a_b', '%a\\_b%'],
        ['x\\y', '%x\\\\y%']
    ])("search %s is escaped as %s", async (search, param) => {
        await countPublishedProducts({ locale: 'bg', search });

        const [sql, params] = pool.query.mock.calls[0];

        expect(params).toStrictEqual(['bg', param]);
        expect(sql).toEqual(expect.stringContaining('pt.name ILIKE $2'));
    });

    test("search is a partial, case-insensitive match on the name", async () => {
        await countPublishedProducts({ locale: 'bg', search: 'яке' });

        const [sql, params] = pool.query.mock.calls[0];

        expect(params).toStrictEqual(['bg', '%яке%']);
        expect(sql).toContain('pt.name ILIKE $2');
    });

    test.each([
        ['mainCategoryId', 1, 's.main_category_id = $2'],
        ['subCategoryId', 3, 'p.subcategory_id = $2'],
        ['minNetCents', 1000, 'p.price_cents >= $2'],
        ['maxNetCents', 5999, 'p.price_cents <= $2']
    ])("filter %s adds its param and condition", async (filter, value, condition) => {
        await countPublishedProducts({ locale: 'bg', [filter]: value });

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining(condition), ['bg', value]);
    });

    test("filter by attributes passes the ids as one array param", async () => {
        await countPublishedProducts({ locale: 'bg', attributeValueIds: [4, 9] });

        const [sql, params] = pool.query.mock.calls[0];

        expect(params).toStrictEqual(['bg', [4, 9]]);
        expect(sql).toContain('ANY ($2)');
    });

    test("throws error when locale is not supported", async () => {

        await expect(countPublishedProducts({})).rejects.toThrow('Expected locale to be one of bg, en, got undefined');
    });
});

describe("findPublishedProducts", () => {
    const rows = [
        { id: '10', name: 'Яке Rain', short_description: 'Леко яке за дъжд', price_cents: 5999, quantity: 3, image_path: '/images/products/10-1.svg' }
    ];

    test("returns the rows", async () => {
        pool.query.mockResolvedValue({ rows });

        const result = await findPublishedProducts({ criteria: { locale: 'bg' }, sort: 'newest', limit: 20, offset: 0 });

        expect(result).toBe(rows);
    });

    test("puts limit and offset after the filter params", async () => {
        await findPublishedProducts({ criteria: { locale: 'en', subCategoryId: 3 }, sort: 'newest', limit: 20, offset: 40 });

        const [sql, params] = pool.query.mock.calls[0];

        expect(params).toStrictEqual(['en', 3, 20, 40]);
        expect(sql).toContain('LIMIT $3 OFFSET $4');
    });

    test("uses the same filters as the count", async () => {
        const criteria = { locale: 'bg', mainCategoryId: 1, minNetCents: 1000, attributeValueIds: [4] };

        await countPublishedProducts(criteria);
        await findPublishedProducts({ criteria, sort: 'newest', limit: 20, offset: 0 });

        const countParams = pool.query.mock.calls[0][1];
        const pageParams = pool.query.mock.calls[1][1];

        expect(pageParams).toStrictEqual([...countParams, 20, 0]);
    });

    test.each([
        ['price_asc', 'ORDER BY p.price_cents ASC, p.id ASC'],
        ['price_desc', 'ORDER BY p.price_cents DESC, p.id ASC'],
        ['name_asc', 'ORDER BY pt.name ASC, p.id ASC'],
        ['name_desc', 'ORDER BY pt.name DESC, p.id ASC'],
        ['newest', 'ORDER BY p.created_at DESC, p.id DESC']
    ])("sort %s → %s", async (sort, orderBy) => {
        await findPublishedProducts({ criteria: { locale: 'bg' }, sort, limit: 20, offset: 0 });

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining(orderBy), expect.any(Array));
    });

    test.each([
        ['oldest'],
        ['toString'],
        ['constructor']
    ])("rejects sort %s without querying the db", async (sort) => {
        await expect(findPublishedProducts({ criteria: { locale: 'bg' }, sort, limit: 20, offset: 0 })).rejects.toThrow(`No SQL mapping for sort "${sort}"`);

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("propagates database errors", async () => {
        const error = new Error('any database error');
        pool.query.mockRejectedValue(error);

        await expect(findPublishedProducts({ criteria: { locale: 'bg' }, sort: 'newest', limit: 20, offset: 0 })).rejects.toBe(error);
    });

});