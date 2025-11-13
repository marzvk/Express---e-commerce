const Product = require('../../models/e-commerce/products');
const Key = require('../../models/e-commerce/key');



// ========================================
// VER CARRITO
// ========================================
exports.view_cart = (req, res) => {
    const cart = req.session.cart || [];

    const subtotal = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);

    res.render('cart/view', {
        title: 'Carrito de compras',
        cart,
        subtotal
    });
};


// ========================================
// ADD to CARRITO
// ========================================
exports.add_to_cart = async (req, res) => {
    try {
        const { productId, platform } = req.body;


        const product = await Product.findById(productId);
        if (!product || !product.active) {
            req.flash('error_msg', 'Producto no disponible');
            return res.redirect('/products');
        }

        // // Ver si hay keys disponibles, busqueda por indice compuesto
        // const availableKeys = await Key.countDocuments({
        //     product: productId,
        //     platform: platform,
        //     status: 'available'
        // });
        // if (availableKeys === 0) {
        //     req.flash('error_msg', 'No hay keys disponibles para esta plataforma');
        //     return res.redirect(`/products/${product.slug}`);
        // }

        // Verificar si esta en el cart
        const existingItem = req.session.cart.find(
            item => item.productId && item.productId.toString() === productId && item.platform === platform
        );
        if (existingItem) {
            req.flash('info_msg', 'Este producto ya esta en tu carrito');
            return res.redirect('/cart');
        }

        // Agregando al carrito
        req.session.cart.push({
            productId: product._id,
            title: product.title,
            slug: product.slug,
            platform: platform,
            price: product.price,
            discount: product.discount,
            finalPrice: product.finalPrice,
            image: product.images?.thumbnail || '/images/placeholder.jpg',
            quantity: 1,
            addedAt: new Date()
        });

        req.flash('succes_msg', 'Producto agregado');
        res.redirect('/cart');


    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Error al agregar al carrito');
        res.redirect('/products');
    }
};


// ========================================
// ACTUALIZAR CANTIDAD
// ========================================
exports.update_cart = async (req, res) => {
    const { productId, platform, quantity } = req.body;
    const qty = parseInt(quantity);

    if (qty < 1) {
        // si se pone en 0 es como borrar, llama a remove con req y res
        return exports.remove_from_cart(req, res);
    }

    const item = req.session.cart.find(
        i => i.productId.toString() === productId && (
            Array.isArray(i.platform)
                ? i.platform.includes(platform)
                : i.platform === platform
        )
    );

    if (item) {
        const product = await Product.findById(productId).select('stock').lean();

        const maxQty = Math.min(product.stock, 10);

        if (qty > maxQty) {
            req.flash('error_msg', `Solo podés agregar hasta ${maxQty} unidades de ${item.title}.`);
            item.quantity = maxQty;
        } else {
            item.quantity = qty;
            req.flash('success_msg', 'Carrito actualizado con éxito')
        }

        res.redirect('/cart');
    };
}


// ========================================
// ELIMINAR DEL CARRITO
// ========================================
exports.remove_from_cart = (req, res) => {
    const { productId, platform } = req.body;
    req.session.cart = req.session.cart.filter(
        item => !(item.productId.toString() === productId && item.platform === platform)
    );
    req.flash('success_msg', 'Producto eliminado del carrito');
    res.redirect('/cart');
};



// ========================================
// VACIAR CARRITO
// ========================================
exports.clear_cart = (req, res) => {
    req.session.cart = [];
    req.flash('success_msg', 'Carrito vaciado');
    res.redirect('/cart');
};
