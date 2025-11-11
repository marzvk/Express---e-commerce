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

        // Ver si hay keys disponibles, busqueda por indice compuesto
        const availableKeys = await Key.countDocuments({
            product: productId,
            platform: platform,
            status: 'available'
        });
        if (availableKeys === 0) {
            req.flash('error_msg', 'No hay keys disponibles para esta plataforma');
            return res.redirect(`/products/${product.slug}`);
        }

        // Verificar si esta en el cart
        const existingItem = req.session.cart.find(
            item => item.product.toString() === productId && item.platform === platform
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

