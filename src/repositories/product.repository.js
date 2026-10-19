const { SUPPORTED_LOCALES } = require("../config/catalog");
const pool = require("../db/pool");

const SORT_SQL = {
    price_asc: 'p.price_cents ASC, p.id ASC',
    price_desc: 'p.price_cents DESC, p.id ASC',
    name_asc: 'pt.name ASC, p.id ASC',
    name_desc: 'pt.name DESC, p.id ASC',
    newest: 'p.created_at DESC, p.id DESC'
};

function orderBy(sort) {
    if (!Object.hasOwn(SORT_SQL, sort)) {
        throw new Error(`No SQL mapping for sort "${sort}"`);
    }
    return SORT_SQL[sort];
}

function escapeLike(text) {
    return text.replace(/[\\%_]/g, (ch) => '\\' + ch);
}

function buildProductSource({
    locale,
    mainCategoryId,
    subCategoryId,
    minNetCents,
    maxNetCents,
    attributeValueIds,
    search
}) {

    if (!SUPPORTED_LOCALES.includes(locale)) {
        throw new Error(`Expected locale to be one of ${SUPPORTED_LOCALES.join(', ')}, got ${locale}`);
    }

    const params = [locale];
    const conditions = [
        "p.status = 'published'",
        "s.is_active",
        "mc.is_active"
    ];

    if (mainCategoryId !== undefined) {
        params.push(mainCategoryId);
        conditions.push(`s.main_category_id = $${params.length}`);
    }

    if (subCategoryId !== undefined) {
        params.push(subCategoryId);
        conditions.push(`p.subcategory_id = $${params.length}`);
    }

    if (minNetCents !== undefined) {
        params.push(minNetCents);
        conditions.push(`p.price_cents >= $${params.length}`);
    }

    if (maxNetCents !== undefined) {
        params.push(maxNetCents);
        conditions.push(`p.price_cents <= $${params.length}`);
    }

    if (attributeValueIds !== undefined) {
        params.push(attributeValueIds);
        const valuesParam = `$${params.length}`;

        conditions.push(`p.id IN (
            SELECT pav.product_id
            FROM product_attribute_values pav
            JOIN attribute_values av ON av.id = pav.attribute_value_id
            WHERE pav.attribute_value_id = ANY (${valuesParam})
            GROUP BY pav.product_id
            HAVING COUNT(DISTINCT av.attribute_id) = (
                SELECT COUNT(DISTINCT attribute_id)
                FROM attribute_values
                WHERE id = ANY (${valuesParam})
            )
        )`);
    }

    if (search !== undefined) {
        params.push(`%${escapeLike(search)}%`);
        conditions.push(`pt.name ILIKE $${params.length}`);
    }

    const sql = `
        FROM products p
        JOIN subcategories s
          ON s.id = p.subcategory_id
        JOIN main_categories mc
          ON mc.id = s.main_category_id
        JOIN product_translations pt
          ON pt.product_id = p.id AND pt.locale = $1
        JOIN product_images img
          ON img.product_id = p.id AND img.sort_order = 1
        WHERE ${conditions.join(" AND ")}
    `;

    return { sql, params };
}


async function countPublishedProducts(criteria) {
    const source = buildProductSource(criteria);

    const { rows } = await pool.query(`SELECT count(*) AS total ${source.sql}`, source.params);
    return Number(rows[0].total);
}

async function findPublishedProducts({ criteria, sort, limit, offset }) {
    const source = buildProductSource(criteria);
    const limitParam = source.params.length + 1;
    const offsetParam = source.params.length + 2;

    const sql = `
        SELECT p.id,
               pt.name,
               pt.short_description,
               p.price_cents,
               p.quantity,
               img.file_path AS image_path
        ${source.sql}
        ORDER BY ${orderBy(sort)}
        LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const { rows } = await pool.query(sql, [...source.params, limit, offset]);
    return rows;
}

module.exports = { findPublishedProducts, countPublishedProducts };