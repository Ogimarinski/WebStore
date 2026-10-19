/** @jest-environment jsdom */

const {
    getLocale,
    translate,
    translateCount,
    translateError,
    formatMoney,
    applyStaticTranslations
} = require("../public/js/i18n.js");


beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe("getLocale", () => {
    test("uses bg when nothing is saved", () => {
        expect(getLocale()).toBe('bg');
    });

    test("returns the saved locale", () => {
        localStorage.setItem('locale', 'en');

        expect(getLocale()).toBe('en');
    });

    test("uses bg when the saved locale is not supported", () => {
        localStorage.setItem('locale', 'de');

        expect(getLocale()).toBe('bg');
    });

    test("uses bg when localStorage is not available", () => {
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });

        expect(getLocale()).toBe('bg');
    });
});

describe("translate", () => {
    test("returns the bg text by default", () => {
        expect(translate('next')).toBe('Следваща');
    });

    test("returns the text in the saved locale", () => {
        localStorage.setItem('locale', 'en');

        expect(translate('next')).toBe('Next');
    });

    test("returns the key when there is no text for it", () => {
        expect(translate('missingKey')).toBe('missingKey');
    });
});

describe("translateCount", () => {
    test.each([
        ['bg', 0, 'Намерени 0 продукта'],
        ['bg', 1, 'Намерен 1 продукт'],
        ['bg', 2, 'Намерени 2 продукта'],
        ['en', 1, '1 product found'],
        ['en', 5, '5 products found']
    ])("%s: %i → %p", (locale, count, text) => {
        localStorage.setItem('locale', locale);

        expect(translateCount('resultCount', count)).toBe(text);
    });

    test("uses the other form when the locale has no text for the plural category", () => {
        jest.spyOn(Intl, 'PluralRules').mockImplementation(() => ({ select: () => 'few' }));

        expect(translateCount('resultCount', 3)).toBe('Намерени 3 продукта');
    });
});

describe("translateError", () => {
    test("returns the message for a known code", () => {
        expect(translateError('INVALID_QUERY_PARAM')).toBe('Невалиден филтър. Опитайте с други стойности.');
    });

    test.each([
        ['an unknown code', 'SOMETHING_ELSE'],
        ['no code', undefined],
        ['an inherited object property', 'constructor']
    ])("falls back to INTERNAL_ERROR for %s", (_, code) => {
        expect(translateError(code)).toBe('Възникна грешка. Опитайте отново по-късно.');
    });
});

describe("formatMoney", () => {
    // bg-BG слага непрекъсваем интервал (\u00a0) между сумата и знака за валута.
    test.each([
        ['bg', 7199, '71,99\u00a0€'],
        ['bg', 149880, '1498,80\u00a0€'],
        ['en', 7199, '€71.99']
    ])("%s: %i cents → %p", (locale, cents, text) => {
        localStorage.setItem('locale', locale);

        expect(formatMoney(cents, 'EUR')).toBe(text);
    });
});


describe("applyStaticTranslations", () => {
    test("sets the page language and translates the marked elements", () => {
        document.body.innerHTML = '<p data-i18n="next"></p><p data-i18n="previous"></p>';
        localStorage.setItem('locale', 'en');

        applyStaticTranslations();

        const texts = [...document.querySelectorAll('[data-i18n]')].map((element) => element.textContent);

        expect(document.documentElement.lang).toBe('en');
        expect(texts).toStrictEqual(['Next', 'Previous']);
    });
});