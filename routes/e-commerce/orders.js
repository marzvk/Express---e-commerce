const express = require('express');
const router = express.Router();

const orderController = require('../../controllers/e-commerce/orderController');
const { ensureAuthenticated } = require('../../middleware/auth');

router.use(ensureAuthenticated);

// =================================
// MANDAMOS LA LISTA
// =================================
router.get('/', orderController.order_list);


// =================================
// PROCESAMOS LA LISTA
// =================================
router.get('/:id', orderController.order_detail);


module.exports = router;
