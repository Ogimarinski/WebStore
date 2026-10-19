const AppError = require("../src/errors/AppError");
const { invalidParam, rejectUnknownParams, parseEnumParam, parseLocale, parseIntegerParam, parseIntegerListParam, parseText, parseCategoryParams } = require("../src/validators/queryParams");


describe("queryParams", () => {
    describe("invalidParam", () => {
        test.each([
            ['unknown', 'unknown parameter'],
            ['locales', 'expected one of "bg", "en"'],
            ['page', 'expected an integer between 1 and 500']
        ])("builds a 400 AppError for %s", (param, reason) => {

            const error = invalidParam(param, reason);

            expect(error).toBeInstanceOf(AppError);
            expect(error.status).toBe(400);
            expect(error.message).toBe(`Invalid "${param}": ${reason}`);
            expect(error.code).toBe('INVALID_QUERY_PARAM');
            expect(error.details).toStrictEqual({ param });
        });
    });

    describe("rejectUnknownParams", () => {
        test.each([
            ['password'],
            ['toString'],
            ['page[x]']
        ])("rejects the unknown param %s", (param) => {

            expect(() => (rejectUnknownParams({ page: '1', [param]: 'test' }, ['page']))).toThrow(expect.objectContaining({ code: 'INVALID_QUERY_PARAM', details: { param } }));
        });

        test("accepts an empty query", () => {
            expect(() => rejectUnknownParams({}, ['page'])).not.toThrow();
        });

        test("accepts a query with allowed params", () => {
            expect(() => rejectUnknownParams({ page: '1' }, ['page'])).not.toThrow();
        });
    });

    describe("parseEnumParam", () => {
        const allowed = ['price_asc', 'newest'];

        test("returns the fallback when the param is missing", () => {
            expect(parseEnumParam({}, 'sort', allowed, 'newest')).toBe('newest');
        });

        test("returns an allowed value", () => {
            expect(parseEnumParam({ sort: 'price_asc' }, 'sort', allowed, 'newest')).toBe('price_asc');
        });

        test.each([
            ['an unknown value', 'cheapest'],
            ['a different case', 'PRICE_ASC'],
            ['an empty value', ''],
            ['an inherited object property', 'toString'],
            ['a repeated param', ['price_asc', 'newest']]
        ])("rejects %s", (_, value) => {
            expect(() => parseEnumParam({ sort: value }, 'sort', allowed, 'newest')).toThrow(expect.objectContaining({ code: 'INVALID_QUERY_PARAM', details: { param: 'sort' } }));
        });
    });

    describe("parseLocale", () => {
        test("uses bg when the locale is missing", () => {
            expect(parseLocale({})).toBe('bg');
        });

        test("returns en", () => {
            expect(parseLocale({ locale: 'en' })).toBe('en');
        });

        test.each([
            ['de'],
            ['BG'],
            ['']
        ])("rejects the locale %p", (locale) => {
            expect(() => parseLocale({ locale })).toThrow(expect.objectContaining({ code: 'INVALID_QUERY_PARAM', details: { param: 'locale' } }));
        });
    });

    describe("parseIntegerParam", () => {
        const limits = { min: 1, max: 5 };

        test("returns the fallback when the param is missing", () => {
            expect(parseIntegerParam({}, 'page', { ...limits, fallback: 1 })).toBe(1);
        });

        test("returns undefined when the param is missing and there is no fallback", () => {
            expect(parseIntegerParam({}, 'page', limits)).toBeUndefined();
        });

        test.each([
            ['1', 1],
            ['3', 3],
            ['5', 5]
        ])("parses %p as %i", (value, expected) => {
            expect(parseIntegerParam({ page: value }, 'page', limits)).toBe(expected);
        });

        test.each([
            ['below min', '0'],
            ['above max', '6'],
            ['empty', ''],
            ['not a number', 'abc'],
            ['a fraction', '1.5'],
            ['negative', '-1'],
            ['with spaces', ' 3 '],
            ['in exponent form', '1e3'],
            ['hexadecimal', '0x10'],
            ['too large for a number', '99999999999999999999'],
            ['repeated', ['1', '2']],
            ['with a leading zero', '05']
        ])("rejects a value %s: %p", (_, value) => {
            expect(() => parseIntegerParam({ page: value }, 'page', limits)).toThrow(expect.objectContaining({ code: 'INVALID_QUERY_PARAM', details: { param: 'page' } }));
        });
    });

    describe("parseIntegerListParam", () => {
        const limits = { min: 1, max: 100, maxItems: 3 };

        test("returns undefined when the param is missing", () => {
            expect(parseIntegerListParam({}, 'attributeValueId', limits)).toBeUndefined();
        });

        test("turns a single value into a list", () => {
            expect(parseIntegerListParam({ attributeValueId: '4' }, 'attributeValueId', limits)).toStrictEqual([4]);
        });

        test("parses a repeated param", () => {
            expect(parseIntegerListParam({ attributeValueId: ['4', '9'] }, 'attributeValueId', limits)).toStrictEqual([4, 9]);
        });

        test("removes duplicates and keeps the first order", () => {
            expect(parseIntegerListParam({ attributeValueId: ['9', '4', '9'] }, 'attributeValueId', limits)).toStrictEqual([9, 4]);
        });

        test("accepts exactly maxItems values", () => {
            expect(parseIntegerListParam({ attributeValueId: ['1', '2', '3'] }, 'attributeValueId', limits)).toStrictEqual([1, 2, 3]);
        });

        test.each([
            ['more than maxItems', ['1', '2', '3', '4']],
            ['more than maxItems even if they repeat', ['1', '1', '1', '1']],
            ['one invalid item', ['4', 'abc']],
            ['an empty value', ''],
            ['an item out of range', ['4', '101']]
        ])("rejects %s", (_, value) => {
            expect(() => parseIntegerListParam({ attributeValueId: value }, 'attributeValueId', limits)).toThrow(expect.objectContaining({ code: 'INVALID_QUERY_PARAM', details: { param: 'attributeValueId' } }));
        });
    });

    describe("parseText", () => {
        const limits = { minLength: 2, maxLength: 5 };

        test("returns undefined when the param is missing", () => {
            expect(parseText({}, 'search', limits)).toBeUndefined();
        });

        test.each([
            ['ab', 'ab'],
            ['  яке  ', 'яке'],
            ['abcde', 'abcde']
        ])("returns %p as %p", (value, expected) => {
            expect(parseText({ search: value }, 'search', limits)).toBe(expected);
        });

        test.each([
            ['too short', 'a'],
            ['too short after trimming', '  a  '],
            ['only spaces', '   '],
            ['empty', ''],
            ['too long', 'abcdef'],
            ['repeated', ['яке', 'тениска']]
        ])("rejects a value %s: %p", (_, value) => {
            expect(() => parseText({ search: value }, 'search', limits)).toThrow(expect.objectContaining({ code: 'INVALID_QUERY_PARAM', details: { param: 'search' } }));
        });
    });

    describe("parseCategoryParams", () => {
        test("returns both as undefined when there is no category", () => {
            expect(parseCategoryParams({})).toStrictEqual({ mainCategoryId: undefined, subCategoryId: undefined });
        });

        test("parses a main category", () => {
            expect(parseCategoryParams({ mainCategoryId: '1' })).toStrictEqual({ mainCategoryId: 1, subCategoryId: undefined });
        });

        test("parses a subcategory", () => {
            expect(parseCategoryParams({ subCategoryId: '3' })).toStrictEqual({ mainCategoryId: undefined, subCategoryId: 3 });
        });

        test.each([
            ['both categories', { mainCategoryId: '1', subCategoryId: '3' }, 'subCategoryId'],
            ['a main category of 0', { mainCategoryId: '0' }, 'mainCategoryId'],
            ['a subcategory above the int limit', { subCategoryId: '2147483648' }, 'subCategoryId']
        ])("rejects %s", (_, query, param) => {
            expect(() => parseCategoryParams(query)).toThrow(expect.objectContaining({ code: 'INVALID_QUERY_PARAM', details: { param } }));
        });
    });

});