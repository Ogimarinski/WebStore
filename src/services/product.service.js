const productRepository = require("../repositories/product.repository");
const { PAGE_SIZE } = require("../config/catalog");

const VAT_RATE = 20;
const CURRENCY = 'EUR';

function assertNonNegativeInteger(value, name) {
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`${name} must be a non-negative integer, got ${value}`);
    }
}

function vatCentsOf(netCents) {
    assertNonNegativeInteger(netCents, 'netCents');

    return Math.round((netCents * VAT_RATE) / 100);
}

function grossCentsOf(netCents) {
    return netCents + vatCentsOf(netCents);
}

function minNetForGross(grossCents) {
    assertNonNegativeInteger(grossCents, 'grossCents');

    let net = Math.floor((grossCents * 100) / (100 + VAT_RATE));

    while (grossCentsOf(net) < grossCents) {
        net++;
    }

    return net;
}

function maxNetForGross(grossCents) {
    assertNonNegativeInteger(grossCents, 'grossCents');

    let net = Math.floor((grossCents * 100) / (100 + VAT_RATE));

    while (grossCentsOf(net + 1) <= grossCents) {
        net++;
    }

    return net;
}

function toProduct(row) {
    const priceCents = row.price_cents;
    const vatCents = vatCentsOf(priceCents);

    return {
        id: Number(row.id),
        name: row.name,
        shortDescription: row.short_description,
        priceCents,
        vatCents,
        totalCents: priceCents + vatCents,
        currency: CURRENCY,
        vatRate: VAT_RATE,
        image: row.image_path,
        inStock: row.quantity > 0
    };
}

async function getPublishedProducts({ locale, sort, page, filters }) {
    const offset = (page - 1) * PAGE_SIZE;

    const criteria = {
        locale,
        mainCategoryId: filters.mainCategoryId,
        subCategoryId: filters.subCategoryId,
        minNetCents: filters.minPriceCents === undefined ? undefined : minNetForGross(filters.minPriceCents),
        maxNetCents: filters.maxPriceCents === undefined ? undefined : maxNetForGross(filters.maxPriceCents),
        attributeValueIds: filters.attributeValueIds,
        search: filters.search
    };

    const [rows, total] = await Promise.all([
        productRepository.findPublishedProducts({ criteria, sort, limit: PAGE_SIZE, offset }),
        productRepository.countPublishedProducts(criteria)
    ]);

    return { items: rows.map(toProduct), total };
}

module.exports = { getPublishedProducts };