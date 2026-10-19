const SUPPORTED_LOCALES = ['bg', 'en'];
const DEFAULT_LOCALE = 'bg';
const STORAGE_KEY = 'locale';

const LOCALE_TAGS = { bg: 'bg-BG', en: 'en-GB' };

const MESSAGES = {
    bg: {
        outOfStock: 'Изчерпан',
        noResults: 'Няма намерени продукти.',
        previous: 'Предишна',
        next: 'Следваща',
        resultCount: {
            one: 'Намерен {count} продукт',
            other: 'Намерени {count} продукта'
        },
        errors: {
            INVALID_QUERY_PARAM: 'Невалиден филтър. Опитайте с други стойности.',
            NOT_FOUND: 'Страницата не е намерена.',
            INTERNAL_ERROR: 'Възникна грешка. Опитайте отново по-късно.'
        }
    },
    en: {
        outOfStock: 'Out of stock',
        noResults: 'No products found.',
        previous: 'Previous',
        next: 'Next',
        resultCount: {
            one: '{count} product found',
            other: '{count} products found'
        },
        errors: {
            INVALID_QUERY_PARAM: 'Invalid filter. Please try other values.',
            NOT_FOUND: 'Page not found.',
            INTERNAL_ERROR: 'Something went wrong. Please try again later.'
        }
    }
};

export function getLocale() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return SUPPORTED_LOCALES.includes(saved) ? saved : DEFAULT_LOCALE;
    } catch {
        return DEFAULT_LOCALE;
    }
}

function fillPlaceholders(text, vars) {
    return text.replace(/\{(\w+)\}/g, (match, name) => (Object.hasOwn(vars, name) ? String(vars[name]) : match));
}

export function translate(key) {
    return MESSAGES[getLocale()][key] ?? key;
}

export function translateCount(key, count) {
    const locale = getLocale();
    const forms = MESSAGES[locale][key];
    const form = forms[new Intl.PluralRules(locale).select(count)] ?? forms.other;

    return fillPlaceholders(form, { count });
}

export function translateError(code) {
    const errors = MESSAGES[getLocale()].errors;

    return Object.hasOwn(errors, code)
        ? errors[code]
        : errors.INTERNAL_ERROR;
}

export function formatMoney(cents, currency) {
    return new Intl.NumberFormat(LOCALE_TAGS[getLocale()], { style: 'currency', currency }).format(cents / 100);
}

export function applyStaticTranslations() {
    document.documentElement.lang = getLocale();

    for (const element of document.querySelectorAll('[data-i18n]')) {
        element.textContent = translate(element.dataset.i18n);
    }
}