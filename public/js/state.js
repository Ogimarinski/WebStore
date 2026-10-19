const INTEGER_KEYS = ['mainCategoryId', 'subCategoryId', 'page'];

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

export function readState() {
    const params = new URLSearchParams(window.location.search);
    const state = {};

    for (const key of INTEGER_KEYS) {
        const value = params.get(key);

        if (value !== null && POSITIVE_INTEGER_PATTERN.test(value)) {
            state[key] = Number(value);
        }
    }

    return state;
}

//адрес за състояние
export function urlFor(state) {
    const params = new URLSearchParams();

    for (const key of INTEGER_KEYS) {
        const value = state[key];

        if (value === undefined || (key === 'page' && value === 1)) {
            continue;
        }

        params.set(key, value);
    }
    const query = params.toString();

    return query ? `?${query}` : window.location.pathname;
}