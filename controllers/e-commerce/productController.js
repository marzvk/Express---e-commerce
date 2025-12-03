
const platforms = require('../../config/platforms');
const { PLATFORMS } = require('../../config/platforms');
const Product = require('../../models/e-commerce/products');
const Order = require('../../models/e-commerce/order');
const { validationResult, body, escape } = require('express-validator');

const { deleteCloudinaryImage } = require('../../utils/cloudinaryHelper');

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
        .isFloat({ min: 0.01 }).withMessage('El precio debe ser mayor a 0')
        .escape(),

    body('discount')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0, max: 100 }).withMessage('El descuento debe estar entre 0 y 100')
        .escape(),

    body('platform')
        .custom((value) => {
            // Convertir a array si es string
            if (typeof value === 'string') {
                value = [value];
            }
            if (!Array.isArray(value) || value.length === 0) {
                throw new Error('Selecciona al menos una plataforma');
            }
            return true;
        }),

    body('genre')
        .optional({ checkFalsy: true }),

    body('developer')
        .trim()
        .escape()
        .optional({ checkFalsy: true }),

    body('publisher')
        .trim()
        .escape()
        .optional({ checkFalsy: true }),

    body('releaseDate')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('La fecha debe tener formato válido'),

    body('tags')
        .optional({ checkFalsy: true })
        .trim()
        .escape(),

    body('stock')
        .optional({ checkFalsy: true })
        .isInt({ min: 0 }).withMessage('El stock debe ser un número positivo')
        .escape()
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
        product: { genre: [] },
        platforms: PLATFORMS,
        errors: []
    });
};



// ========================================
// PROCESAR CREAR PRODUCTO CON IMAGENES
// // ========================================
exports.product_create_post = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render("admin/product_form", {
            title: "Crear Producto",
            product: req.body,
            platforms: PLATFORMS,
            errors: errors.array()
        });
    }

    const {
        title, description, price, discount,
        platform: selectedPlatforms, genre,
        developer, publisher, releaseDate,
        tags, featured, stock
    } = req.body;

    try {
        const images = {
            thumbnail:
                req.cloudinaryFiles?.thumbnail?.[0] ||
                { url: "/images/placeholder-game.jpg", public_id: null },

            cover:
                req.cloudinaryFiles?.cover?.[0] ||
                { url: "/images/placeholder-game.jpg", public_id: null },

            screenshots:
                req.cloudinaryFiles?.screenshots || []
        };

        const product = new Product({
            title,
            description,
            price: parseFloat(price),
            discount: discount ? parseFloat(discount) : 0,
            platform: Array.isArray(selectedPlatforms) ? selectedPlatforms : [selectedPlatforms],
            genre: genre ? (Array.isArray(genre) ? genre : [genre]) : [],
            developer: developer || "",
            publisher: publisher || "",
            releaseDate: releaseDate || null,
            tags: tags ? tags.split(",").map(t => t.trim()) : [],
            featured: featured === "on",
            stock: stock ? parseInt(stock) : 0,
            images
        });

        product.slug = product.generateSlug();
        await product.save();

        req.flash("success_msg", "Producto creado exitosamente");
        res.redirect("/admin/products");

    } catch (err) {
        console.error("❌ Error creando producto:", err);
        res.render("admin/product_form", {
            title: "Crear Producto",
            product: req.body,
            platforms: PLATFORMS,
            errors: [{ msg: "Error al crear el producto" }]
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
        if (product.tags && !Array.isArray(product.tags)) {
            product.tags = Array.isArray(product.tags) ? product.tags : [];
        }

        // Si tags es array, conviértelo a string para el input
        if (Array.isArray(product.tags)) {
            product.tagsString = product.tags.join(', ');
        }

        res.render('admin/product_form', {
            title: 'Editar producto',
            product,
            platforms: PLATFORMS,
            errors: []
        });

    } catch (error) {
        return next(error)
    }
};


exports.product_update_post = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render("admin/product_form", {
            title: "Editar producto",
            product: { _id: req.params.id, ...req.body },
            platforms: PLATFORMS,
            errors: errors.array()
        });
    }

    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            req.flash("error_msg", "Producto no encontrado");
            return res.redirect("/admin/products");
        }

        const {
            title, description, price, discount, platform,
            genre, developer, publisher, releaseDate,
            tags, featured, stock, deleteThumbnail,
            deleteCover, deleteScreenshots
        } = req.body;

        // ========================================
        // ACTUALIZAR CAMPOS BÁSICOS
        // ========================================
        product.title = title;
        product.slug = product.generateSlug();
        product.description = description;
        product.price = parseFloat(price);
        product.discount = discount ? parseFloat(discount) : 0;
        product.platform = Array.isArray(platform) ? platform : [platform];
        product.genre = genre ? (Array.isArray(genre) ? genre : [genre]) : [];
        product.developer = developer || "";
        product.publisher = publisher || "";
        product.releaseDate = releaseDate || null;
        product.tags = tags ? tags.split(",").map(t => t.trim()) : [];
        product.featured = featured === "on";
        product.stock = stock ? parseInt(stock) : 0;

        // ========================================
        // ELIMINAR IMÁGENES (Si el usuario marca eliminar)
        // ========================================
        if (deleteThumbnail === "on" && product.images?.thumbnail?.public_id) {
            try {
                await deleteCloudinaryImage(product.images.thumbnail.public_id);
                product.images.thumbnail = {
                    url: "/images/placeholder-game.jpg",
                    public_id: null
                };
            } catch (err) {
                console.error('❌ Error eliminando thumbnail:', err);
            }
        }

        if (deleteCover === "on" && product.images?.cover?.public_id) {
            try {
                await deleteCloudinaryImage(product.images.cover.public_id);
                product.images.cover = {
                    url: "/images/placeholder-game.jpg",
                    public_id: null
                };
            } catch (err) {
                console.error('❌ Error eliminando cover:', err);
            }
        }

        if (deleteScreenshots && product.images?.screenshots?.length) {
            const toDelete = Array.isArray(deleteScreenshots)
                ? deleteScreenshots
                : [deleteScreenshots];

            for (const publicId of toDelete) {
                try {
                    await deleteCloudinaryImage(publicId);
                } catch (err) {
                    console.error(`❌ Error eliminando screenshot ${publicId}:`, err);
                }
            }

            product.images.screenshots = product.images.screenshots.filter(
                img => !toDelete.includes(img.public_id)
            );
        }

        // ========================================
        // SUBIR NUEVAS IMÁGENES
        // ========================================

        // HELPER: Normalizar imagen (asegurar que es objeto con url y public_id)
        const normalizeImage = (imgData) => {
            if (!imgData) return null;

            // Si ya es un objeto con url, devolverlo
            if (imgData.url && imgData.public_id) {
                return imgData;
            }

            // Si es un objeto con secure_url (de Cloudinary)
            if (imgData.secure_url && imgData.public_id) {
                return {
                    url: imgData.secure_url,
                    public_id: imgData.public_id
                };
            }

            // Si es un string (URL), devolver con public_id null
            if (typeof imgData === 'string') {
                return {
                    url: imgData,
                    public_id: null
                };
            }

            return null;
        };

        // Thumbnail
        if (req.cloudinaryFiles?.thumbnail?.[0]) {
            try {
                if (product.images?.thumbnail?.public_id) {
                    await deleteCloudinaryImage(product.images.thumbnail.public_id);
                }

                const normalizedImg = normalizeImage(req.cloudinaryFiles.thumbnail[0]);
                if (normalizedImg) {
                    product.images.thumbnail = normalizedImg;
                    console.log('✅ Thumbnail actualizado:', normalizedImg);
                }
            } catch (err) {
                console.error('❌ Error actualizando thumbnail:', err);
                req.flash('error_msg', 'Error al actualizar thumbnail');
            }
        }

        // Cover
        if (req.cloudinaryFiles?.cover?.[0]) {
            try {
                if (product.images?.cover?.public_id) {
                    await deleteCloudinaryImage(product.images.cover.public_id);
                }

                const normalizedImg = normalizeImage(req.cloudinaryFiles.cover[0]);
                if (normalizedImg) {
                    product.images.cover = normalizedImg;
                    console.log('✅ Cover actualizado:', normalizedImg);
                }
            } catch (err) {
                console.error('❌ Error actualizando cover:', err);
                req.flash('error_msg', 'Error al actualizar cover');
            }
        }

        // Screenshots
        if (req.cloudinaryFiles?.screenshots?.length) {
            try {
                const normalizedScreenshots = req.cloudinaryFiles.screenshots
                    .map(img => normalizeImage(img))
                    .filter(img => img !== null);

                if (normalizedScreenshots.length > 0) {
                    product.images.screenshots.push(...normalizedScreenshots);
                    console.log('✅ Screenshots agregados:', normalizedScreenshots.length);
                }
            } catch (err) {
                console.error('❌ Error actualizando screenshots:', err);
                req.flash('error_msg', 'Error al actualizar screenshots');
            }
        }

        // ========================================
        // GUARDAR
        // ========================================
        await product.save();

        req.flash("success_msg", "Producto actualizado exitosamente");
        res.redirect("/admin/products");

    } catch (err) {
        console.error("❌ Error actualizando producto:", err);
        req.flash("error_msg", `Error: ${err.message}`);
        res.redirect("/admin/products");
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

exports.product_delete_post = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            req.flash("error_msg", "Producto no encontrado");
            return res.redirect("/admin/products");
        }

        // Eliminar imágenes de Cloudinary
        const imagesToDelete = [];

        if (product.images?.thumbnail?.public_id) {
            imagesToDelete.push(product.images.thumbnail.public_id);
        }

        if (product.images?.cover?.public_id) {
            imagesToDelete.push(product.images.cover.public_id);
        }

        if (product.images?.screenshots?.length) {
            product.images.screenshots.forEach(img => {
                if (img.public_id) imagesToDelete.push(img.public_id);
            });
        }

        // Eliminar todas las imágenes
        for (const publicId of imagesToDelete) {
            try {
                await deleteCloudinaryImage(publicId);
            } catch (err) {
                console.error(`⚠️ Error eliminando ${publicId}:`, err);
                // Continuar aunque falle una
            }
        }


        await Product.findByIdAndDelete(req.params.id);

        req.flash("success_msg", `Producto "${product.title}" eliminado`);
        res.redirect("/admin/products");

    } catch (err) {
        console.error("❌ Error eliminando producto:", err);
        req.flash("error_msg", "Error al eliminar producto");
        res.redirect("/admin/products");
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

        // Estadisticas ventas
        const totalOrders = await Order.countDocuments();
        const completedOrders = await Order.countDocuments({ status: 'completed' });

        const salesData = await Order.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const totlRevenue = salesData.length > 0 ? salesData[0].total : 0;

        // Ventas del mes
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const monthlyRevenue = await Order.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: firstDayOfMonth }
                }
            },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const thisMonthRevenue = monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0;

        // Top 5 prod mas vendidos
        const topProducts = await Order.aggregate([
            { $match: { status: 'completed' } },
            { $unwind: '$products' }, // separa cada prod en su propia fila
            {
                $group: {
                    _id: '$products.product',
                    title: { $first: '$products.title' },
                    count: { $sum: 1 },
                    revenue: { $sum: '$products.price' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);





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



// ========================================
// CATÁLOGO PÚBLICO (para /products)
// ========================================
exports.catalog_get = async (req, res, next) => {
    try {
        // Paginacion
        const page = parseInt(req.query.page) || 1;
        const limit = 9 // 9 por pagina
        const skip = (page - 1) * limit;

        // Filtros 
        const filters = { active: true };

        // por plataforma, siempre si esta en query($in busca en un array)
        if (req.query.platform) {
            const platforms = Array.isArray(req.query.platform) ? req.query.platform : req.query.platform.split(',').map(p => p.trim());
            filters.platform = { $in: platforms };
        }

        //  por genre
        if (req.query.genre) {
            filters.genre = { $in: req.query.genre.split(', ') };
        }

        const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // busqueda de texto ( search )
        if (req.query.search) {
            const search = escapeRegex(req.query.search.trim());
            filters.$or = [
                { title: { $regex: String(`\\b${search}\\b`), $options: 'i' } }, // i = case insensitive, regex= like
                { tags: { $regex: String(`\\b${search}\\b`), $options: 'i' } }
            ];
        }

        // ORDENAMIENTO(si hay va primero destacado, sino por fecha)
        let sortOption = { createdAt: -1 };

        if (req.query.sort === 'price-asc') {
            sortOption = { finalPrice: 1 };
        } else if (req.query.sort === 'price-desc') {
            sortOption = { finalPrice: -1 };
        } else if (req.query.sort === 'featured') {
            sortOption = { featured: -1, createdAt: -1 };
        }

        // Buscar los productos
        const products = await Product.find(filters)
            .sort(sortOption)
            .limit(limit)
            .skip(skip)
            .select('title slug price discount finalPrice platform genre images featured rating')
            .exec();

        const totalProducts = await Product.countDocuments(filters);
        const totalPages = Math.ceil(totalProducts / limit);

        res.render('products/catalog', {
            title: 'Catalogo de Juegos',
            products,
            currentPage: page,
            platforms: PLATFORMS,
            totalPages,
            filters: req.query, // quedan activos los filtros mandados
            totalProducts
        });

    } catch (error) {
        return next(error)
    }
};


// ========================================
// DETALLE DE PRODUCTO
// ========================================
exports.product_detail_get = async (req, res, next) => {
    try {
        const product = await Product.findOne({
            slug: req.params.slug,
            active: true
        }).exec();

        if (!product) {
            const error = new Error('Producto no encontrado');
            error.stats = 404;
            return next(error)
        }

        // productos relacionados para mostrar(se excluye el actual)
        const relacionados = await Product.find({
            genre: { $in: product.genre },
            _id: { $ne: product._id },
            active: true
        })
            .limit(4)
            .select('title slug price finalPrice images platform')
            .exec();

        console.log('DEBUG product.images (first product or current product):', product.images);
        console.log('DEBUG types:', {
            thumbnail: typeof product.images?.thumbnail,
            cover: typeof product.images?.cover,
            screenshots: Array.isArray(product.images?.screenshots) ? product.images.screenshots.map(s => typeof s) : typeof product.images?.screenshots
        });
        res.render('products/detail', {
            product,
            relacionados
        })

    } catch (error) {
        return next(error)
    }
}