const express = require('express');
const router = express.Router();
const productController = require('../../controllers/e-commerce/productController');
const { ensureAdmin, ensureAuthenticated } = require('../../middleware/auth');

// const { uploadProduct } = require('../../config/multer');
const { uploadProduct, uploadToCloudinaryMultiple } = require('../../middleware/upload');


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
    uploadProduct.fields([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
        { name: 'screenshots', maxCount: 5 }
    ]),
    uploadToCloudinaryMultiple,
    productController.validateProduct,
    productController.product_create_post
);


// ========================================
// EDITAR PRODUCTO
// ========================================
// GET - Mostrar formulario de edición
router.get('/products/:id/edit', productController.product_update_get);
// POST - Procesar edit
router.post('/products/:id/edit',
    uploadProduct.fields([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
        { name: 'screenshots', maxCount: 5 }
    ]),
    uploadToCloudinaryMultiple,
    productController.validateProduct,
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