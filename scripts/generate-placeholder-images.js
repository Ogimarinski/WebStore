// Генерира SVG картинки за всеки ред в product_images - само за разработка.
// Пуска се от главната папка на проекта: npm run images:generate
require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const pool = require('../src/db/pool');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildSvg({ productId, name, sortOrder }) {
    // Един цвят за продукт, различна светлина за всяка от трите снимки.
    const hue = (productId * 67) % 360;
    const lightness = [35, 50, 65][sortOrder - 1];
    const label = sortOrder === 1 ? 'основна' : 'допълнителна';

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <rect width="600" height="600" fill="hsl(${hue}, 45%, ${lightness}%)"/>
    <g fill="#fff" font-family="Arial, sans-serif" text-anchor="middle">
        <text x="300" y="270" font-size="40" font-weight="bold">${escapeXml(name)}</text>
        <text x="300" y="340" font-size="64">${sortOrder}/3</text>
        <text x="300" y="400" font-size="28">${label} · product #${productId}</text>
    </g>
</svg>
`;
}

async function main() {
    const { rows } = await pool.query(`
        SELECT pi.product_id, pi.sort_order, pi.file_path, pt.name
        FROM product_images pi
        LEFT JOIN product_translations pt
               ON pt.product_id = pi.product_id AND pt.locale = 'bg'
        ORDER BY pi.product_id, pi.sort_order
    `);

    for (const row of rows) {
        if (!row.file_path.endsWith('.svg')) {
            throw new Error(`${row.file_path}: скриптът прави само .svg - смени разширението в seed.sql`);
        }

        const target = path.join(PUBLIC_DIR, row.file_path);

        // Пътят идва от базата - не позволяваме запис извън public/.
        if (!target.startsWith(PUBLIC_DIR + path.sep)) {
            throw new Error(`${row.file_path}: пътят излиза извън public/`);
        }

        const svg = buildSvg({
            productId: Number(row.product_id),
            name: row.name ?? `Продукт #${row.product_id}`,
            sortOrder: row.sort_order,
        });

        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, svg, 'utf8');
    }

    console.log(`Генерирани ${rows.length} картинки в ${PUBLIC_DIR}`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => pool.end());