// Логиката на страницата с каталога: зарежда данни, реагира на кликове и
// на бутона "назад". Рисуването е в render.js, заявките в api.js.

import { apiGet } from './api.js';
import { getLocale, applyStaticTranslations } from './i18n.js';
import { readState } from './state.js';
import {
    renderProducts,
    renderCount,
    renderPagination,
    renderError
} from './render.js';

const elements = {
    count: document.getElementById('result-count'),
    grid: document.getElementById('product-grid'),
    pagination: document.getElementById('pagination')
};

// Ако потребителят кликне бързо две категории, отговорът за първата може да
// пристигне след този за втората и да покаже грешните продукти. Затова всяка
// нова заявка прекъсва предишната.
let productsRequest = null;

function loadProducts(state) {
    productsRequest?.abort();
    productsRequest = new AbortController();

    return apiGet('/api/products', { locale: getLocale(), ...state }, { signal: productsRequest.signal });
}

async function renderPage() {
    const state = readState();

    try {
        const data = await loadProducts(state);

        renderCount(elements.count, data.total);
        renderProducts(elements.grid, data.items);
        renderPagination(elements.pagination, data, state);
    } catch (error) {
        // Прекъсната заявка не е грешка: по-нова вече е тръгнала и тя ще нарисува страницата.
        if (error.name === 'AbortError') {
            return;
        }

        elements.count.textContent = '';
        elements.pagination.replaceChildren();
        renderError(elements.grid, error);
    }
}

function handleLinkClick(event) {
    const link = event.target.closest('a[data-no-reload]');

    if (!link) {
        return;
    }

    // Ctrl/Cmd/Shift+клик и среден бутон: оставяме браузъра да отвори нов раздел.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) {
        return;
    }

    event.preventDefault();
    history.pushState(null, '', link.getAttribute('href'));
    renderPage();
}

function init() {
    applyStaticTranslations();

    document.addEventListener('click', handleLinkClick);
    window.addEventListener('popstate', renderPage);

    renderPage();
}

init();