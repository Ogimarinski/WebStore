export class ApiError extends Error {
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

function buildQuery(params) {
    const search = new URLSearchParams();

    for (const key of Object.keys(params)) {
        const value = params[key];

        if (value === undefined) {
            continue;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                search.append(key, item);
            }
        } else {
            search.append(key, value);
        }
    }

    return search.toString();
}

export async function apiGet(path, params = {}, { signal } = {}) {
    const query = buildQuery(params);
    const url = query ? `${path}?${query}` : path;

    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        throw new ApiError(
            response.status,
            body?.error?.code ?? 'INTERNAL_ERROR',
            body?.error?.message ?? response.statusText
        );
    }

    return body;
}