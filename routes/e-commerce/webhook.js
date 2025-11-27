const express = require('express');
const router = express.Router();
const webhookController = require('../../controllers/e-commerce/webhookController');

// Webhook Mercado Pago (IPN) instant payment notification
router.post('/mercadopago', express.json(), webhookController.mercadopago_webhook);

module.exports = router;

