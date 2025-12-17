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

// ========================================
// DETALLE DE ORDEN (ADMIN)
// ========================================
exports.order_detail = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'username email')
            .populate('products.product')
            .exec();

        if (!order) {
            req.flash('error_msg', 'Orden no encontrada');
            return res.redirect('/admin/orders');
        }

        // Obtener las keys
        const keysData = await Promise.all(
            order.products.map(async (p) => {
                const key = await Key.findById(p.key);
                return {
                    title: p.title,
                    platform: p.platform,
                    price: p.price,
                    key: key ? key.key : 'Key no encontrada',
                    keyStatus: key ? key.status : 'desconocido'
                };
            })
        );

        res.render('admin/orders_detail', {
            title: `Orden #${order._id.toString().slice(-8).toUpperCase()}`,
            order,
            keys: keysData
        });
    } catch (err) {
        return next(err);
    }
};

// ========================================
// REEMBOLSAR ORDEN (MERCADOPAGO)
// ========================================
exports.order_refund = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            req.flash('error_msg', 'Orden no encontrada');
            return res.redirect('/admin/orders');
        }

        if (order.status === 'refunded') {
            req.flash('error_msg', 'Esta orden ya fue reembolsada');
            return res.redirect(`/admin/orders/${order._id}`);
        }

        if (order.status !== 'completed') {
            req.flash('error_msg', 'Solo se pueden reembolsar órdenes completadas');
            return res.redirect(`/admin/orders/${order._id}`);
        }

        // ========================================
        // PROCESAR REEMBOLSO EN MERCADOPAGO
        // ========================================
        if (order.paymentMethod === 'mercadopago' && order.paymentId) {
            try {
                console.log(`💸 Procesando reembolso para pago: ${order.paymentId}`);

                // Crear reembolso en MercadoPago
                const refund = await paymentClient.refund({ id: order.paymentId });

                console.log('✅ Reembolso procesado en MercadoPago:', refund.id);

            } catch (mpError) {
                console.error('❌ Error al procesar reembolso en MercadoPago:', mpError.message);
                req.flash('error_msg', 'Error al procesar reembolso en MercadoPago: ' + mpError.message);
                return res.redirect(`/admin/orders/${order._id}`);
            }
        }

        // ========================================
        // ACTUALIZAR ESTADO DE LA ORDEN
        // ========================================
        order.status = 'refunded';
        await order.save();
        console.log('✅ Orden actualizada a reembolsada:', order._id);

        // ========================================
        // LIBERAR LAS KEYS (volver a disponibles)
        // ========================================
        await Key.updateMany(
            { _id: { $in: order.products.map(p => p.key) } },
            {
                status: 'available',
                assignedTo: null,
                soldAt: null,
                order: null
            }
        );
        console.log('✅ Keys liberadas');

        // ========================================
        // ACTUALIZAR STOCK DE PRODUCTOS
        // ========================================
        for (const item of order.products) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: 1 }
            });
        }
        console.log('✅ Stock actualizado');

        req.flash('success_msg', 'Reembolso procesado exitosamente. Las keys fueron liberadas.');
        res.redirect(`/admin/orders/${order._id}`);

    } catch (err) {
        console.error('❌ Error en order_refund:', err.message);
        req.flash('error_msg', 'Error al procesar el reembolso');
        res.redirect('/admin/orders');
    }
};


// ========================================
// EXPORTAR ÓRDENES A CSV
// ========================================
exports.export_csv = async (req, res) => {
    try {
        const orders = await Order.find({ status: 'completed' })
            .populate('user', 'username email')
            .sort({ createdAt: -1 })
            .exec();

        // Crear CSV
        let csv = 'Orden,Usuario,Email,Total,Fecha\n';

        orders.forEach(order => {
            csv += `${order._id},`;
            csv += `${order.user ? order.user.username : 'N/A'},`;
            csv += `${order.user ? order.user.email : 'N/A'},`;
            csv += `${order.total},`;
            csv += `${order.createdAt.toISOString()}\n`;
        });

        // Enviar archivo
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=ordenes.csv');
        res.send(csv);

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error al exportar');
        res.redirect('/admin/orders');
    }
};