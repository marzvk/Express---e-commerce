const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

// Crear orden de pago
const preferenceClient = new Preference(client);

// Consulta de estado de pago
const paymentClient = new Payment(client);

module.exports = {
    client,
    preferenceClient,
    paymentClient
};
