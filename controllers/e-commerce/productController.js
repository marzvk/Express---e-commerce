const Product = require('../../models/e-commerce/products');
const { validationResult, body, escape } = require('express-validator');

// ========================================
// VALIDACIONES
// ========================================
exports.validateProduct = [
    body('title')
        .trim()
        .escape()
        .notEmpty().withMessage('El título es obligatorio')
        .isLength({ min: 3 }).withMessage('El título debe tener al menos 3 caracteres')
        .isLength({ max: 200 }).withMessage('El título no puede exceder 200 caracteres'),

    body('description')
        .trim()
        .escape()
        .notEmpty().withMessage('La descripción es obligatoria')
        .isLength({ min: 10 }).withMessage('La descripción debe tener al menos 10 caracteres'),

    body('price')
        .notEmpty().withMessage('El precio es obligatorio')
        .isFloat({ min: 0.01 }).withMessage('El precio debe ser mayor a 0'),

    body('discount')
        .optional()
        .isFloat({ min: 0, max: 100 }).withMessage('El descuento debe estar entre 0 y 100'),

    body('platform')
        .notEmpty().withMessage('Selecciona al menos una plataforma'),

    body('genre')
        .optional()
        .if(() => false).escape(),

    body('developer')
        .trim()
        .escape()
        .optional(),

    body('publisher')
        .trim()
        .escape()
        .optional(),

    body('releaseDate')
        .optional()
        .isISO8601().withMessage('La fecha debe tener formato válido'),

    body('stock')
        .optional()
        .isInt({ min: 0 }).withMessage('El stock debe ser un número positivo')
];


// ========================================
// LISTA DE PRODUCTOS (Admin)
// ========================================
exports.admin_product_list = async (req, res, next) => {
    try {
        const products = await Product.find()
            .sort({ createdAt: -1 })
            .exec();

        res.render('admin/products_list', {
            title: 'Getion de Productos',
            products
        });

    } catch (error) {
        return next(error)
    }
};




// ========================================
// FORMULARIO CREAR PRODUCTO
// ========================================
exports.product_create_get = async (req, res, next) => {
    res.render('admin/product_form', {
        title: 'Crear Producto',
        product: null,
        errors: []
    });
};



// ========================================
// PROCESAR CREAR PRODUCTO
// ========================================
exports.product_create_post = async (req, res, next) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('admin/product_form', {
            title: 'Crear Producto',
            product: req.body,
            errors: errors.array()
        });
    }

    const {
        title,
        description,
        price,
        discount,
        platform,
        genre,
        developer,
        publisher,
        releaseDate,
        tags,
        featured,
        stock
    } = req.body;


    try {
        const product = new Product({
            title,
            description,
            price: parseFloat(price),
            discount: discount ? parseFloat(discount) : 0,
            platform: Array.isArray(platform) ? platform : [platform],
            genre: genre ? (Array.isArray(genre) ? genre : [genre]) : [],
            developer: developer || '',
            publisher: publisher || '',
            releaseDate: releaseDate || null,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            featured: featured === 'on',
            stock: stock ? parseInt(stock) : 0
        });


        // Generar slug(url mas bonita)
        product.slug = product.generateSlug();

        await product.save();

        req.flash('success_msg', 'Producto creado exitosamente');
        res.redirect('/admin/products');

    } catch (error) {
        console.error(error);

        let errorMsg = 'Error al crear el producto';
        // codigo 11000 error de mongodb ("clave duplicada" )
        if (err.code === 11000) {
            errorMsg = 'Ya existe un producto con ese título';
        }

        res.render('admin/product_form', {
            title: 'Crear Producto',
            product: req.body,
            errors: [{ msg: errorMsg }]
        });
    }
};


// ========================================
// FORMULARIO EDITAR PRODUCTO
// ========================================
exports.product_update_get = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id).exec();

        if (!product) {
            req.flash('error_msg', 'Producto no encontrado')
            return res.redirect('/admin/products');
        }

        res.render('admin/product_form', {
            title: 'Editar producto',
            product,
            errors: []
        });

    } catch (error) {
        return next(error)
    }
};




// ========================================
// PROCESAR EDITAR PRODUCTO
// ========================================
exports.product_update_post = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('admin/product_form', {
            title: 'Editar producto',
            product: { _id: req.params.id, ...req.body },
            errors: errors.array()
        });
    }

    const {
        title,
        description,
        price,
        discount,
        platform,
        genre,
        developer,
        publisher,
        releaseDate,
        tags,
        featured,
        stock
    } = req.body;

    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            req.flash('error_msg', 'Producto no encontrado');
            return res.redirect('/admin/products');
        }

        // Actualizar campos
        product.title = title;
        product.slug = product.generateSlug();
        product.description = description;
        product.price = parseFloat(price);
        product.discount = discount ? parseFloat(discount) : 0;
        product.platform = Array.isArray(platform) ? platform : [platform];
        product.genre = genre ? (Array.isArray(genre) ? genre : [genre]) : [];
        product.developer = developer || '';
        product.publisher = publisher || '';
        product.releaseDate = releaseDate || null;
        product.tags = tags ? tags.split(',').map(t => t.trim()) : [];
        product.featured = featured === 'on';
        product.stock = stock ? parseInt(stock) : 0;

        await product.save();

        req.flash('success_msg', 'Producto actualizado exitosamente');
        res.redirect('/admin/products');


    } catch (error) {
        console.error(err);

        res.render('admin/product_form', {
            title: 'Editar Producto',
            product: { _id: req.params.id, ...req.body },
            errors: [{ msg: 'Error al actualizar el producto' }]
        });
    }
};



// ========================================
// CONFIRMACIÓN ELIMINAR PRODUCTO (GET)
// ========================================
exports.product_delete_get = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            req.flash('error_msg', 'Producto no encontrado');
            return res.redirect('/admin/products');
        }

        res.render('admin/product_delete_confirm', {
            title: 'Confirmar Eliminación',
            product: product
        });
    } catch (err) {
        return next(err);
    }
};

// ========================================
// ELIMINAR PRODUCTO (POST)
// ========================================
exports.product_delete_post = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            req.flash('error_msg', 'Producto no encontrado');
            return res.redirect('/admin/products');
        }

        await Product.findByIdAndDelete(req.params.id);

        req.flash('success_msg', `Producto "${product.title}" eliminado exitosamente`);
        res.redirect('/admin/products');

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error al eliminar el producto');
        res.redirect('/admin/products');
    }
};



// ========================================
// DASHBOARD ADMIN (básico, estadisticas)
// ========================================
exports.admin_dashboard = async (req, res, next) => {
    try {
        const totalProducts = await Product.countDocuments();
        const activeProducts = await Product.countDocuments({ active: true });
        const lowStock = await Product.countDocuments({ stock: { $lt: 10 } });
        const outOfStock = await Product.countDocuments({ stock: 0 });

        res.render('admin/dashboard', {
            title: 'Panel de Administración',
            stats: {
                totalProducts,
                activeProducts,
                lowStock,
                outOfStock
            }
        });
    } catch (err) {
        return next(err);
    }
};
