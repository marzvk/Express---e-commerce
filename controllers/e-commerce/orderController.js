const Order = require('../../models/e-commerce/order');
const Key = require('../../models/e-commerce/key');


// ========================================
// LISTA DE ÓRDENES DEL USUARIO
// ========================================
exports.order_list = async (req, res, next) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .exec();

        res.render('orders/list', {
            title: 'Mis Ordenes',
            orders
        });
    } catch (error) {
        return next(error);
    }
};


// ========================================
// DETALLE DE ORDEN
// ========================================
exports.order_detail = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('products.product')
            .exec();

        if (!order) {
            req.flash('error_msg', 'Orden de compra no encontrada')
            return res.redirect('/orders');
        }

        // ver q la orden es del usuario
        if (order.user.toString() !== req.user._id.toString()) {
            req.flash('error_msg', 'No estas autorizado a ver esta orden');
            return res.redirect('/orders');
        }

        // Traer las KEYS
        const keyData = await Promise.all(
            order.products.map(async (p) => {
                const key = await Key.findById(p.key);
                return {
                    title: p.title,
                    platform: p.platform,
                    key: key.key
                };
            })
        );

        res.render('orders/detail', {
            title: `Orden #${order._id}`,
            order,
            keys: keyData
        });
    } catch (error) {
        return next(error);
    }
};

