/** @jest-environment jsdom */

jest.mock("../public/js/api.js");

const { apiGet } = require("../public/js/api.js");


const products = {
    items: [
        { id: 1, name: 'Яке Rain', totalCents: 7199, currency: 'EUR', image: '/1.svg', inStock: true },
        { id: 2, name: 'Яке Winter', totalCents: 10799, currency: 'EUR', image: '/2.svg', inStock: true }
    ],
    page: 1,
    pageSize: 20,
    total: 2,
    totalPages: 1
};


beforeAll(async () => {
    document.body.innerHTML = `
        <p id="result-count"></p>
        <div id="product-grid"></div>
        <nav id="pagination"></nav>
        <a id="page-link" href="?page=2" data-no-reload>2</a>
        <a id="plain-link" href="/about">About</a>
    `;
    window.history.pushState({}, '', '/');
    apiGet.mockResolvedValue(products);

    require('../public/js/catalog.page.js');

    await new Promise((resolve) => setTimeout(resolve));
});

beforeEach(() => {
    apiGet.mockClear();
    apiGet.mockResolvedValue(products);
});

afterEach(() => {
    jest.restoreAllMocks();
});


test("loads and shows the products when the page opens", () => {
    expect(document.getElementById('result-count').textContent).toBe('Намерени 2 продукта');
    expect(document.querySelectorAll('#product-grid article')).toHaveLength(2);
});

test("opens a marked link without reloading the page", async () => {
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

    document.getElementById('page-link').dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(window.location.search).toBe('?page=2');
    expect(apiGet).toHaveBeenCalledWith('/api/products', { locale: 'bg', page: 2 }, { signal: expect.any(AbortSignal) });
});

test("lets the browser handle ctrl+click(new tab)", () => {
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });

    jest.spyOn(console, 'error').mockImplementation(() => { });

    document.getElementById('page-link').dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
    expect(apiGet).not.toHaveBeenCalled();
});

test("leaves link without data-no-reload to the browser", () => {
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    jest.spyOn(console, 'error').mockImplementation(() => { });

    document.getElementById('plain-link').dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
    expect(apiGet).not.toHaveBeenCalled();
});

test("renders again when the user goes back", async () => {
    window.history.pushState({}, '', '/?page=3');

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(apiGet).toHaveBeenCalledWith('/api/products', { locale: 'bg', page: 3 }, { signal: expect.any(AbortSignal) });
});

test("shows an error message when loading fails", async () => {
    apiGet.mockRejectedValue({ name: 'ApiError', code: 'INVALID_QUERY_PARAM' });

    window.dispatchEvent(new PopStateEvent('popstate'));
    await new Promise((resolve) => setTimeout(resolve));

    expect(document.getElementById('product-grid').textContent).toBe('Невалиден филтър. Опитайте с други стойности.');
    expect(document.getElementById('result-count').textContent).toBe('');
    expect(document.getElementById('pagination').children).toHaveLength(0);
});

test("keeps the page as it is when the request was aborted", async () => {
    window.dispatchEvent(new PopStateEvent('popstate'));
    await new Promise((resolve) => setTimeout(resolve));

    const before = document.getElementById('product-grid').innerHTML;
    apiGet.mockRejectedValue(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));

    window.dispatchEvent(new PopStateEvent('popstate'));
    await new Promise((resolve) => setTimeout(resolve));

    expect(document.getElementById('product-grid').innerHTML).toBe(before);
});

test("aborts the previous request when a new one starts", async () => {
    // Първата заявка седи на pending, докато втората започне.
    apiGet.mockImplementation(() => new Promise(() => { }));

    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new PopStateEvent('popstate'));

    const firstSignal = apiGet.mock.calls[0][2].signal;
    const secondSignal = apiGet.mock.calls[1][2].signal;

    expect(firstSignal.aborted).toBe(true);
    expect(secondSignal.aborted).toBe(false);
});