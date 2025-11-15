const Product = require('../../models/e-commerce/products');
const Key = require('../../models/e-commerce/key');
const Order = require('../../models/e-commerce/order');



// ========================================
// MOSTRAR CHECKOUT
// ========================================
exports.checkout_get = (req, res) => {
    const cart = req.session.cart || []

    if (cart.length === 0) {
        req.flash('error_msg', 'El carrito esta vacio');
        return res.redirect('/cart');
    }

    const total = cart.reduce((acc, item) => acc + (item.quantity * item.finalPrice), 0);

    res.render('checkout/view', {
        title: 'Finalizar su Compra',
        cart,
        total
    });
};


// ========================================
// PROCESAR CHECKOUT (SIMULADO)
// ========================================
exports.checkout_post = async (req, res) => {
    try {
        const cart = req.session.cart || []

        if (cart.length === 0) {
            req.flash('error_msg', 'El carrito esta vacio');
            return res.redirect('/cart');
        }

        const total = cart.reduce((acc, item) => acc + (item.quantity * item.finalPrice), 0);

        // Asignar key a cada producto
        const productsWithKeys = [];

        for (const item of cart) {
            // busqueda key disponible
            const key = await Key.findOneAndUpdate(
                {
                    product: item.productId,
                    platform: item.platform,
                    status: 'available'
                },
                {
                    status: 'sold',
                    soldAt: new Date(),
                    assignedTo: req.user._id
                },
                { new: true }
            );

            if (!key) {
                throw new Error(`Sin stock de ${item.title} para ${item.platform}`);
            }

            productsWithKeys.push({
                product: item.productId,
                platform: item.platform,
                title: item.title,
                price: item.finalPrice,
                key: key._id
            });
        }

        // Orden 
        const order = new Order({
            user: req.user._id,
            products: productsWithKeys,
            total: total,
            status: 'completed',
            paymentMethod: 'simulated'
        });

        await order.save();

        // Actualizar referencia de order en las keys(filtro, accion)
        await Key.updateMany(
            { _id: { $in: productsWithKeys.map(p => p.key) } },
            { order: order._id }
        );
        
        req.session.cart = [];

        req.flash('success_msg', '¡Compra exitosa! Revisa tus keys');
        res.redirect(`/orders/${order._id}`);

    } catch (err) {
        console.error(err);
        req.flash('error_msg', err.message || 'Error al procesar la compra');
        res.redirect('/cart');
    }
};

