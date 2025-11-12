const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/e-commerce/cartController');
const { ensureAuthenticated } = require('../../middleware/auth');

// ======================================
// Solo los logueados pueden ver carrito
// =====================================
// router.use(ensureAuthenticated)



// ====================================
// Ver carrito(cualquiera)
// ====================================
router.get('/', cartController.view_cart);


// ====================================
// Agregar al carrito
// ====================================
router.post('/add', cartController.add_to_cart);


// ====================================
// Editar cantidad
// ====================================
router.post('/update', cartController.update_cart);


// // ====================================
// // Eliminar del carrito
// // ====================================
router.post('/remove', cartController.remove_from_cart);


// // ====================================
// // Vaciar carrito
// // ====================================
router.post('/clear', cartController.clear_cart);



module.exports = router;