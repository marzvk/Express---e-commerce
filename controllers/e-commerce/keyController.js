
const Key = require('../../models/e-commerce/key');
const Product = require('../../models/e-commerce/products');
const csv = require('csv-parser');
const fs = require('fs');
const {PLATFORMS} = require('../../config/platforms');

// ========================================
// LISTA DE KEYS
// ========================================
exports.key_list = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        // filtros
        const filters = {};

        if (req.query.product) {
            filters.product = req.query.product;
        }

        if (req.query.platform) {
            filters.platform = req.query.platform;
        }

        if (req.query.status) {
            filters.status = req.query.status;
        }

        // Query
        const keys = await Key.find(filters)
            .populate('product', 'title')
            .populate('assignedTo', 'username email')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();

        const totalKeys = await Key.countDocuments(filters);
        const totalPages = Math.ceil(totalKeys / limit);

        // estadistica por estado
        const stats = {
            available: await Key.countDocuments({ status: 'available' }),
            sold: await Key.countDocuments({ status: 'sold' }),
            reserved: await Key.countDocuments({ status: 'reserved' }),
            revoked: await Key.countDocuments({ status: 'revoked' })
        };

        // productos para filtrar
        const products = await Product.find().select('title').sort({ title: -1 });
        const platforms = PLATFORMS;

        res.render('admin/keys_list', {
            title: 'Gestión de Keys',
            keys,
            currentPage: page,
            totalPages,
            filters: req.query,
            stats,
            products,
            platforms
        });


    } catch (error) {
        return next(err);
    }
};




// ========================================
// FORMULARIO UPLOAD CSV
// ========================================
exports.upload_form = async (req, res, next) => {
    try {
        const products = await Product.find({ active: true })
            .select('title platform')
            .sort({ title: 1 });

        res.render('admin/keys_upload', {
            title: 'Cargar Keys desde CSV',
            products
        });
    } catch (err) {
        return next(err);
    }
};


// ========================================
// PROCESAR UPLOAD CSV
// ========================================
exports.upload_csv = async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'No se seleccionó ningún archivo');
            return res.redirect('/admin/keys/upload');
        }

        const keys = [];
        let errors = [];

        // Leer CSV
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (row) => {
                // Validar datos
                if (!row.product_id || !row.platform || !row.key) {
                    errors.push(`Fila inválida: faltan campos`);
                    return;
                }

                keys.push({
                    product: row.product_id.trim(),
                    platform: row.platform.trim(),
                    key: row.key.trim(),
                    status: 'available',
                    uploadedAt: new Date()
                });
            })
            .on('end', async () => {
                try {
                    // Eliminar archivo temporal
                    fs.unlinkSync(req.file.path);

                    if (errors.length > 0) {
                        req.flash('error_msg', errors.join(', '));
                        return res.redirect('/admin/keys/upload');
                    }

                    if (keys.length === 0) {
                        req.flash('error_msg', 'El CSV está vacío o no tiene formato correcto');
                        return res.redirect('/admin/keys/upload');
                    }

                    // Insertar keys
                    await Key.insertMany(keys);

                    // Actualizar stock de productos
                    const productCounts = {};
                    keys.forEach(k => {
                        productCounts[k.product] = (productCounts[k.product] || 0) + 1;
                    });

                    for (const [productId, count] of Object.entries(productCounts)) {
                        await Product.findByIdAndUpdate(productId, {
                            $inc: { stock: count }
                        });
                    }

                    req.flash('success_msg', `${keys.length} keys cargadas exitosamente`);
                    res.redirect('/admin/keys');

                } catch (err) {
                    console.error(err);
                    req.flash('error_msg', 'Error al guardar las keys');
                    res.redirect('/admin/keys/upload');
                }
            });

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error al procesar el archivo');
        res.redirect('/admin/keys/upload');
    }
};



// ========================================
// FORMULARIO AGREGAR KEY MANUAL
// ========================================
exports.key_create_get = async (req, res, next) => {
    try {
        const products = await Product.find({ active: true })
            .select('title platform')
            .sort({ title: 1 });

        res.render('admin/key_form', {
            title: 'Agregar Key Manual',
            products
        });
    } catch (err) {
        return next(err);
    }
};

// ========================================
// PROCESAR AGREGAR KEY MANUAL
// ========================================
exports.key_create_post = async (req, res) => {
    try {
        const { product, platform, key } = req.body;

        if (!product || !platform || !key) {
            req.flash('error_msg', 'Todos los campos son obligatorios');
            return res.redirect('/admin/keys/create');
        }

        // Verificar que la key no exista
        const existingKey = await Key.findOne({ key: key.trim() });
        if (existingKey) {
            req.flash('error_msg', 'Esta key ya existe en el sistema');
            return res.redirect('/admin/keys/create');
        }

        // Crear key
        const newKey = new Key({
            product,
            platform,
            key: key.trim(),
            status: 'available'
        });

        await newKey.save();

        // Actualizar stock del producto
        await Product.findByIdAndUpdate(product, { $inc: { stock: 1 } });

        req.flash('success_msg', 'Key agregada exitosamente');
        res.redirect('/admin/keys');

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error al agregar la key');
        res.redirect('/admin/keys/create');
    }
};

// ========================================
// REVOCAR KEY
// ========================================
exports.key_revoke = async (req, res) => {
    try {
        const key = await Key.findById(req.params.id);

        if (!key) {
            req.flash('error_msg', 'Key no encontrada');
            return res.redirect('/admin/keys');
        }

        // Marcar como revocada
        key.status = 'revoked';
        await key.save();

        // Reducir stock del producto
        await Product.findByIdAndUpdate(key.product, { $inc: { stock: -1 } });

        req.flash('success_msg', 'Key revocada exitosamente');
        res.redirect('/admin/keys');

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error al revocar la key');
        res.redirect('/admin/keys');
    }
};
