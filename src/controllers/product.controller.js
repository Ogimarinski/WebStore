const productService = require("../services/product.service");
const {
    SORT_KEYS,
    DEFAULT_SORT,
    PAGE_SIZE,
    MAX_PAGE,
    MAX_PRICE_CENTS,
    MAX_ATTRIBUTE_VALUE_ID,
    MAX_ATTRIBUTE_VALUES,
    SEARCH_MIN_LENGTH,
    SEARCH_MAX_LENGTH
} = require("../config/catalog");
const {
    invalidParam,
    rejectUnknownParams,
    parseLocale,
    parseEnumParam,
    parseIntegerParam,
    parseIntegerListParam,
    parseText,
    parseCategoryParams
} = require("../validators/queryParams");

const ALLOWED_PARAMS = [
    'locale',
    'sort',
    'page',
    'mainCategoryId',
    'subCategoryId',
    'minPriceCents',
    'maxPriceCents',
    'attributeValueId',
    'search'
];

function parseFilters(query) {
    const { mainCategoryId, subCategoryId } = parseCategoryParams(query);

    const minPriceCents = parseIntegerParam(query, 'minPriceCents', { min: 0, max: MAX_PRICE_CENTS });
    const maxPriceCents = parseIntegerParam(query, 'maxPriceCents', { min: 0, max: MAX_PRICE_CENTS });

    if (minPriceCents !== undefined && maxPriceCents !== undefined && minPriceCents > maxPriceCents) {
        throw invalidParam('maxPriceCents', 'must be greater or equal to minPriceCents');
    }

    const attributeValueIds = parseIntegerListParam(query, 'attributeValueId', {
        min: 1,
        max: MAX_ATTRIBUTE_VALUE_ID,
        maxItems: MAX_ATTRIBUTE_VALUES
    });

    const search = parseText(query, 'search', {
        minLength: SEARCH_MIN_LENGTH,
        maxLength: SEARCH_MAX_LENGTH
    });

    return {
        mainCategoryId,
        subCategoryId,
        minPriceCents,
        maxPriceCents,
        attributeValueIds,
        search
    };
}

async function getProducts(req, res) {
    const query = req.query;
    rejectUnknownParams(query, ALLOWED_PARAMS);

    const locale = parseLocale(query);
    const sort = parseEnumParam(query, 'sort', SORT_KEYS, DEFAULT_SORT);
    const page = parseIntegerParam(query, 'page', { min: 1, max: MAX_PAGE, fallback: 1 });
    const filters = parseFilters(query);

    const { items, total } = await productService.getPublishedProducts({ locale, sort, page, filters });

    res.json({
        items,
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE)
    });
}

module.exports = { getProducts };