
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
