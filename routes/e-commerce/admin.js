const express = require('express');
const router = express.Router();
const productController = require('../../controllers/e-commerce/productController');
const { ensureAdmin, ensureAuthenticated } = require('../../middleware/auth');

// ========================================
// PARA TODAS LAS RUTAS REQUIERE SER ADMIN
// ========================================
router.use(ensureAuthenticated);
router.use(ensureAdmin);

// ========================================
// DASHBOARD ADMIN
// ========================================
router.get('/', productController.admin_dashboard);





// ========================================
// LISTAR PRODUCTOS (Admin)
// ========================================
router.get('/products', productController.admin_product_list);

// ========================================
// CREAR PRODUCTO
// ========================================
// GET - Mostrar formulario
router.get('/products/create', productController.product_create_get);
// POST - Procesar info
router.post('/products/create',
    productController.validateProduct, // middleware
    productController.product_create_post
);

// ========================================
// EDITAR PRODUCTO
// ========================================
// GET - Mostrar formulario de edición
router.get('/products/:id/edit', productController.product_update_get);
// POST - Procesar edit
router.post('/products/:id/edit',
    productController.validateProduct, // Middleware
    productController.product_update_post
);

// ========================================
// ELIMINAR PRODUCTO
// ========================================
// GET - Mostrar formulario de eliminacion
router.get('/products/:id/delete', productController.product_delete_get);
// POST - Procesar eliminacion
router.post('/products/:id/delete', productController.product_delete_post);

module.exports = router;