const express = require('express')
const router = express.Router();
const productController = require('../../controllers/e-commerce/productController');

// Catalogo para el publico, sin login
router.get('/', productController.catalog_get);

// Detail individual del producto
router.get('/:slug', productController.product_detail_get);

module.exports = router;