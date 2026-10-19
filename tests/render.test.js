/** @jest-environment jsdom */

const {
    renderProducts,
    renderCount,
    renderPagination,
    renderError
} = require("../public/js/render.js");

beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
});

describe("renderProducts", () => {
    const product = {
        id: 10,
        name: 'Яке Rain',
        shortDescription: 'Леко яке за дъжд',
        totalCents: 7199,
        currency: 'EUR',
        image: '/images/products/10-1.svg',
        inStock: true
    };

    test("renders one card per product", () => {
        const container = document.createElement('div');

        renderProducts(container, [product, { ...product, id: 11 }]);

        expect(container.querySelectorAll('article.card')).toHaveLength(2);
    });

    test("shows the name, description, price and image", () => {
        const container = document.createElement('div');

        renderProducts(container, [product]);

        const image = container.querySelector('img');

        expect(container.querySelector('h3').textContent).toBe('Яке Rain');
        expect(container.querySelector('.card-text').textContent).toBe('Леко яке за дъжд');
        expect(container.querySelector('.fw-semibold').textContent).toBe('71,99\u00a0€');
        expect(image.getAttribute('src')).toBe('/images/products/10-1.svg');
        expect(image.getAttribute('alt')).toBe('Яке Rain');
        expect(image.getAttribute('loading')).toBe('lazy');
        expect(container.querySelector('.badge')).toBeNull();
    });

    test("shows a message when there are no products", () => {
        const container = document.createElement('div');

        renderProducts(container, []);

        expect(container.querySelector('p').textContent).toBe("Няма намерени продукти.");
    });

    test("leaves out the description when there is none", () => {
        const container = document.createElement('div');

        renderProducts(container, [{ ...product, shortDescription: null }]);

        expect(container.querySelector('.card-text')).toBeNull();
    });

    test("shows out of stock badge", () => {
        const container = document.createElement('div');

        renderProducts(container, [{ ...product, inStock: false }]);

        expect(container.querySelector('.badge').textContent).toBe('Изчерпан');
    });

    test("replaces what was shown before", () => {
        const container = document.createElement('div');
        container.innerHTML = '<p class="old">old</p>';

        renderProducts(container, [product]);

        expect(container.querySelector('.old')).toBeNull();
    });

    test("shows name as text, not as HTML", () => {
        const container = document.createElement('div');

        renderProducts(container, [{ ...product, name: '<img src=x>' }]);

        expect(container.querySelector('h3').textContent).toBe('<img src=x>');
        expect(container.querySelector('h3 img')).toBeNull();
    });
});

describe("renderCount", () => {
    test.each([
        [0, 'Намерени 0 продукта'],
        [1, 'Намерен 1 продукт'],
        [12, 'Намерени 12 продукта']
    ])("%i -> %p", (total, text) => {
        const container = document.createElement('div');

        renderCount(container, total);

        expect(container.textContent).toBe(text);
    });
});

describe("renderPagination", () => {
    test.each([
        [0],
        [1]
    ])("renders nothing when pages are %i", (totalPages) => {
        const container = document.createElement('nav');
        container.innerHTML = '<ul class="old"></ul>';

        renderPagination(container, { page: 1, totalPages }, {});

        expect(container.children).toHaveLength(0);
    });

    test.each([
        [5, 10, ['Предишна', '3', '4', '5', '6', '7', 'Следваща']],
        [1, 10, ['Предишна', '1', '2', '3', 'Следваща']],
        [10, 10, ['Предишна', '8', '9', '10', 'Следваща']],
        [2, 3, ['Предишна', '1', '2', '3', 'Следваща']]
    ])("page %i of %i shows %p", (page, totalPages, labels) => {
        const container = document.createElement('nav');

        renderPagination(container, { page, totalPages }, { page });

        const texts = [...container.querySelectorAll('.page-item')].map((item) => item.textContent);

        expect(texts).toStrictEqual(labels);
    });

    test("marks the current page as active", () => {
        const container = document.createElement('nav');

        renderPagination(container, { page: 5, totalPages: 10 }, { page: 5 });

        expect(container.querySelector('.page-item.active').textContent).toBe('5');
    });

    test("disables previous on the first page", () => {
        const container = document.createElement('nav');

        renderPagination(container, { page: 1, totalPages: 3 }, { page: 1 });

        const first = container.querySelector(".page-item");

        expect(first.classList.contains('disabled')).toBe(true);
        expect(first.querySelector('a')).toBeNull();
    });


    test("disables next on the last page", () => {
        const container = document.createElement('nav');

        renderPagination(container, { page: 5, totalPages: 5 }, { page: 5 });

        const items = container.querySelectorAll('.page-item');
        const last = items[items.length - 1];

        expect(last.classList.contains('disabled')).toBe(true);
        expect(last.querySelector('a')).toBeNull();
    });

    test("links keep the category and change only the page", () => {
        const container = document.createElement('nav');

        renderPagination(container, { page: 2, totalPages: 3 }, { mainCategoryId: 1, page: 2 });

        const hrefs = [...container.querySelectorAll('a')].map((link) => link.getAttribute('href'));

        expect(hrefs).toStrictEqual([
            '?mainCategoryId=1', //предишната
            '?mainCategoryId=1', //1
            '?mainCategoryId=1&page=2', //2
            '?mainCategoryId=1&page=3', //3
            '?mainCategoryId=1&page=3' //следващата
        ]);
    });

    test("marks every link to be opened without reload", () => {
        const container = document.createElement('nav');

        renderPagination(container, { page: 2, totalPages: 3 }, { page: 2 });

        const links = [...container.querySelectorAll('a')];

        expect(links.every((link) => link.hasAttribute('data-no-reload'))).toBe(true);
    });
});

describe("renderError", () => {
    test("shows the translated message for the error code", () => {
        const container = document.createElement('div');

        renderError(container, { code: 'INVALID_QUERY_PARAM' });

        expect(container.querySelector('.alert.alert-danger').textContent).toBe('Невалиден филтър. Опитайте с други стойности.');
    });

    test("shows the general message for an error without a code", () => {
        const container = document.createElement('div');

        renderError(container, new Error('error'));

        expect(container.textContent).toBe('Възникна грешка. Опитайте отново по-късно.');
    });
});