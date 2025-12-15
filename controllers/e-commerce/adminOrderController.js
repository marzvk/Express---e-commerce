const Order = require('../../models/e-commerce/order');
const Key = require('../../models/e-commerce/key');
const Product = require('../../models/e-commerce/products');
const { paymentClient } = require('../../config/mercadopago');

// ========================================
// LISTA DE ÓRDENES (ADMIN)
// ========================================
exports.order_list = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        // Filtros
        const filters = {};

        if (req.query.status) {
            filters.status = req.query.status;
        }

        if (req.query.user) {
            filters.user = req.query.user;
        }

        // Query
        const orders = await Order.find(filters)
            .populate('user', 'username email')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();

        const totalOrders = await Order.countDocuments(filters);
        const totalPages = Math.ceil(totalOrders / limit);

        // Stats
        const stats = {
            completed: await Order.countDocuments({ status: 'completed' }),
            pending: await Order.countDocuments({ status: 'pending' }),
            failed: await Order.countDocuments({ status: 'failed' }),
            refunded: await Order.countDocuments({ status: 'refunded' })
        };

        res.render('admin/orders_list', {
            title: 'Gestión de Órdenes',
            orders,
            currentPage: page,
            totalPages,
            filters: req.query,
            stats
        });
    } catch (err) {
        return next(err);
    }
};
