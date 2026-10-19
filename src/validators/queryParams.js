const AppError = require("../errors/AppError");
const { SUPPORTED_LOCALES, DEFAULT_LOCALE, MAX_CATEGORY_ID } = require("../config/catalog");

const INTEGER_PATTERN = /^(0|[1-9]\d*)$/;

function invalidParam(param, reason) {
    return new AppError(400, `Invalid "${param}": ${reason}`, {
        code: "INVALID_QUERY_PARAM",
        details: { param }
    });
}

function rejectUnknownParams(query, allowed) {
    const unknown = Object.keys(query).find((key) => !allowed.includes(key));

    if (unknown !== undefined) {
        throw invalidParam(unknown, 'unknown parameter');
    }
}

function parseEnumParam(query, param, allowed, fallback) {
    const value = query[param];

    if (value === undefined) {
        return fallback;
    }

    if (typeof value !== 'string' || !allowed.includes(value)) {
        throw invalidParam(param, `expected one of ${allowed.join(", ")}`);
    }

    return value;
}

function toInteger(value, param, { min, max }) {
    const expected = `expected an integer between ${min} and ${max}`;

    if (typeof value !== 'string' || !INTEGER_PATTERN.test(value)) {
        throw invalidParam(param, expected);
    }

    const parsed = Number(value);

    if (parsed < min || parsed > max) {
        throw invalidParam(param, expected);
    }

    return parsed;
}

function parseIntegerParam(query, param, { min, max, fallback }) {
    const value = query[param];

    if (value === undefined) {
        return fallback;
    }

    if (value === '') {
        throw invalidParam(param, 'must not be empty');
    }

    return toInteger(value, param, { min, max });
}

function parseIntegerListParam(query, param, { min, max, maxItems }) {
    const value = query[param];

    if (value === undefined) {
        return undefined;
    }

    const values = Array.isArray(value) ? value : [value];

    if (values.length > maxItems) {
        throw invalidParam(param, `at most ${maxItems} values allowed`);
    }

    const parsed = values.map((item) => toInteger(item, param, { min, max }));

    return [...new Set(parsed)];
}

function parseText(query, param, { minLength, maxLength }) {
    const value = query[param];

    if (value === undefined) {
        return undefined;
    }

    if (typeof value !== 'string') {
        throw invalidParam(param, 'must be given only once');
    }

    const text = value.trim();

    if (text.length < minLength || text.length > maxLength) {
        throw invalidParam(param, `expected between ${minLength} and ${maxLength} characters`);
    }

    return text;
}

function parseLocale(query) {
    return parseEnumParam(query, 'locale', SUPPORTED_LOCALES, DEFAULT_LOCALE);
}

function parseCategoryParams(query) {
    const mainCategoryId = parseIntegerParam(query, 'mainCategoryId', { min: 1, max: MAX_CATEGORY_ID });
    const subCategoryId = parseIntegerParam(query, 'subCategoryId', { min: 1, max: MAX_CATEGORY_ID });

    if (mainCategoryId !== undefined && subCategoryId !== undefined) {
        throw invalidParam('subCategoryId', 'cannot be combined with mainCategoryId');
    }

    return { mainCategoryId, subCategoryId };
}

module.exports = {
    invalidParam,
    rejectUnknownParams,
    parseEnumParam,
    parseIntegerParam,
    parseLocale,
    parseIntegerListParam,
    parseText,
    parseCategoryParams
};