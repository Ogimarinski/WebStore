/** @jest-environment jsdom */

const { readState, urlFor } = require("../public/js/state.js");

describe("readState", () => {
    test("returns an empty state when the address has no params", () => {
        window.history.pushState({}, '', '/');

        expect(readState()).toStrictEqual({});
    });

    test("reads the main category and the page as numbers", () => {
        window.history.pushState({}, '', '/?mainCategoryId=1&page=2');

        expect(readState()).toStrictEqual({ mainCategoryId: 1, page: 2 });
    });

    test("reads the subcategory", () => {
        window.history.pushState({}, '', '/?subCategoryId=1');

        expect(readState()).toStrictEqual({ subCategoryId: 1 });
    });

    test.each([
        ['zero', '/?page=0'],
        ['negative', '/?page=-1'],
        ['with a leading zero', '/?page=05'],
        ['a fraction', '/?page=1.5'],
        ['not a number', '/?page=abc'],
        ['empty', '/?page=']
    ])("drops a page that is %s", (_, url) => {
        window.history.pushState({}, '', url);

        expect(readState()).toStrictEqual({});
    });

    test("ignores params it does not know", () => {
        window.history.pushState({}, '', '/?sort=price_asc&page=2');

        expect(readState()).toStrictEqual({ page: 2 });
    });

    test("uses the first value of a repeated param", () => {
        window.history.pushState({}, '', '/?page=2&page=3');

        expect(readState()).toStrictEqual({ page: 2 });
    });
});

describe("urlFor", () => {
    test("returns the current path when the state is empty", () => {
        window.history.pushState({}, '', '/catalog');

        expect(urlFor({})).toBe('/catalog');
    });

    test("writes the category and the page", () => {
        expect(urlFor({ mainCategoryId: 1, page: 2 })).toBe('?mainCategoryId=1&page=2');
    });

    test("leaves out page 1", () => {
        expect(urlFor({ subCategoryId: 3, page: 1 })).toBe('?subCategoryId=3');
    });

    test("leaves out undefined values", () => {
        expect(urlFor({ mainCategoryId: undefined, page: 2 })).toBe('?page=2');
    });

    test("always writes the params in the same order", () => {
        expect(urlFor({ page: 2, subCategoryId: 3 })).toBe('?subCategoryId=3&page=2');
    });

    test("ignores keys it does not know", () => {
        window.history.pushState({}, '', '/');

        expect(urlFor({ sort: 'price_asc' })).toBe('/');
    });

    test("gives back the same state after a round trip through the address", () => {
        const state = { mainCategoryId: 1, page: 4 };

        window.history.pushState({}, '', urlFor(state));

        expect(readState()).toStrictEqual(state);
    });
});