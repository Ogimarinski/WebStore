const PAGE_SIZE = 20;
const MAX_OFFSET = 10000;

module.exports = {
    SUPPORTED_LOCALES: ['bg', 'en'],
    DEFAULT_LOCALE: 'bg',

    SORT_KEYS: ['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest'],
    DEFAULT_SORT: 'newest',

    PAGE_SIZE,
    MAX_PAGE: MAX_OFFSET / PAGE_SIZE,

    MAX_CATEGORY_ID: 2147483647,
    MAX_PRICE_CENTS: 1000000,

    MAX_ATTRIBUTE_VALUE_ID: 2147483647,
    MAX_ATTRIBUTE_VALUES: 20,

    SEARCH_MIN_LENGTH: 2,
    SEARCH_MAX_LENGTH: 255
};