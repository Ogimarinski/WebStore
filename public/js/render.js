import { translate, translateCount, translateError, formatMoney } from "./i18n.js";
import { urlFor } from "./state.js";


function el(tag, { className, text, attributes } = {}, children = []) {
    const node = document.createElement(tag);

    if (className) {
        node.className = className;
    }

    if (text !== undefined) {
        node.textContent = text;
    }

    for (const name of Object.keys(attributes ?? {})) {
        node.setAttribute(name, attributes[name]);
    }

    node.append(...children);
    return node;
}

function productCard(product) {
    const image = el('img', {
        className: 'card-img-top',
        attributes: { src: product.image, alt: product.name, loading: 'lazy' }
    });

    const body = el('div', { className: 'card-body d-flex flex-column' }, [
        el('h3', {
            className: 'h6 card-title',
            text: product.name
        })
    ]);

    if (product.shortDescription) {
        body.append(el('p', {
            className: 'card-text small text-body-secondary',
            text: product.shortDescription
        }));
    }

    body.append(el('p', {
        className: 'fw-semibold mt-auto mb-0',
        text: formatMoney(product.totalCents, product.currency)
    }));

    if (!product.inStock) {
        body.append(el('span', {
            className: 'badge text-bg-secondary align-self-start mt-2',
            text: translate('outOfStock')
        }));
    }

    return el('div', { className: 'col' }, [el('article', { className: 'card h-100' }, [image, body])]);
}

export function renderProducts(container, products) {
    if (products.length === 0) {
        container.replaceChildren(el('p', {
            className: 'col-12 text-body-secondary',
            text: translate('noResults')
        }));

        return;
    }

    container.replaceChildren(...products.map(productCard));
}

export function renderCount(container, total) {
    container.textContent = translateCount('resultCount', total);
}

function paginationButton(label, targetPage, state, { isDisabled = false, isActive = false } = {}) {
    if (isDisabled) {
        return el('li', { className: 'page-item disabled' }, [
            el('span', {
                className: 'page-link disabled',
                text: label,
            })
        ]);
    }

    const link = el('a', {
        className: 'page-link',
        text: label,
        attributes: { href: urlFor({ ...state, page: targetPage }), 'data-no-reload': '' }
    });

    return el('li', {
        className: `page-item ${isActive ? 'active' : ''}`
    }, [link]);
}

export function renderPagination(container, { page, totalPages }, state) {
    if (totalPages <= 1) {
        container.replaceChildren();
        return;
    }

    const from = Math.max(1, page - 2);
    const to = Math.min(totalPages, page + 2);

    const items = [paginationButton(translate('previous'), page - 1, state, { isDisabled: page <= 1 })];

    for (let number = from; number <= to; number++) {
        items.push(paginationButton(String(number), number, state, { isActive: number === page }));
    }

    items.push(paginationButton(translate('next'), page + 1, state, { isDisabled: page >= totalPages }));

    container.replaceChildren(el('ul', { className: 'pagination justify-content-center' }, items));
}

export function renderError(container, error) {
    const message = error?.code ? translateError(error.code) : translateError('INTERNAL_ERROR');
    container.replaceChildren(el('div', { className: 'col-12 alert alert-danger', text: message }));
}