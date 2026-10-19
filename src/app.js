const path = require('path');
const express = require('express');
const AppError = require('./errors/AppError');
const errorHandler = require('./middleware/errorHandler');
const productRoutes = require('./routes/product.routes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use('/vendor/bootstrap', express.static(path.join(__dirname, "..", "node_modules", "bootstrap", "dist")));

app.use('/api/products', productRoutes);

app.use('/api', () => {
    throw new AppError(404, "Endpoint not found");
});

app.use(errorHandler);

module.exports = app;