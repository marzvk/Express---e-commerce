const express = require('express');
const router = express.Router();

const checkoutController = require('../../controllers/e-commerce/checkoutController');
const { ensureAuthenticated } = require('../../middleware/auth');

// Todas las rutas necesitan estar logueado
router.use(ensureAuthenticated);

router.get('/', checkoutController.checkout_get);
router.post('/process', checkoutController.checkout_post);

module.exports = router;
