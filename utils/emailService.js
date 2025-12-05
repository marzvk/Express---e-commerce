
const transporter = require('../config/email');
const { orderConfirmationHTML, welcomeEmail, orderPendingHTML } = require('./emailTemplates');
const User = require('../models/user');
const Order = require('../models/e-commerce/order');
const Key = require('../models/e-commerce/key');

// ========================================
// ENVIAR CONFIRMACIÓN DE ORDEN
// ========================================
exports.sendOrderConfirmation = async (userId, orderId) => {
    try {
        const user = await User.findById(userId);
        const order = await Order.findById(orderId).populate('products.product');

        // Obtener keys desencriptadas
        const keys = await Promise.all(
            order.products.map(async (p) => {
                const key = await Key.findById(p.key);
                return {
                    title: p.title,
                    platform: p.platform,
                    key: key.key
                };
            })
        );

        const mailOptions = {
            from: `"GameKeys Store 🎮" <${process.env.GMAIL_USER}>`,
            to: user.email,
            subject: `✅ Tu orden #${order._id.toString().slice(-8).toUpperCase()} - Keys de juegos`,
            html: orderConfirmationHTML(user, order, keys)
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email de confirmación enviado a ${user.email}`);

    } catch (err) {
        console.error('❌ Error enviando email:', err);
    }
};

// ========================================
// ENVIAR EMAIL DE BIENVENIDA
// ========================================
exports.sendWelcomeEmail = async (user) => {
    try {
        const mailOptions = {
            from: `"GameKeys Store 🎮" <${process.env.GMAIL_USER}>`,
            to: user.email,
            subject: '🎮 ¡Bienvenido a GameKeys Store!',
            html: welcomeEmail(user)
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email de bienvenida enviado a ${user.email}`);

    } catch (err) {
        console.error('❌ Error enviando email de bienvenida:', err);
    }
};

// ========================================
// ENVIAR EMAIL DE PAGO PENDIENTE
// ========================================
exports.sendOrderPending = async (userId, orderId) => {
    try {
        const user = await User.findById(userId);
        const order = await Order.findById(orderId);

        const mailOptions = {
            from: `"GameKeys Store 🎮" <${process.env.GMAIL_USER}>`,
            to: user.email,
            subject: `⏳ Pago pendiente - Orden #${order._id.toString().slice(-8).toUpperCase()}`,
            html: orderPendingHTML(user, order)
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email de pago pendiente enviado a ${user.email}`);

    } catch (err) {
        console.error('❌ Error enviando email de pendiente:', err);
    }
};