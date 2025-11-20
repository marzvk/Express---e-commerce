const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

const storage = multer.memoryStorage();

const uploadProduct = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Subida múltiple → Cloudinary moderno
async function uploadToCloudinaryMultiple(req, res, next) {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            return next();
        }

        const uploadBuffer = (buffer, folder) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder, resource_type: 'image' },
                    (err, result) => {
                        if (err) return reject(err);
                        resolve({
                            url: result.secure_url,
                            public_id: result.public_id
                        });
                    }
                );

                const bufferStream = new Readable();
                bufferStream.push(buffer);
                bufferStream.push(null);
                bufferStream.pipe(stream);
            });
        };

        const uploaded = {};

        for (const fieldName of Object.keys(req.files)) {
            uploaded[fieldName] = [];

            for (const file of req.files[fieldName]) {
                const location = `gamekeys/products/${fieldName}`;
                const result = await uploadBuffer(file.buffer, location);
                uploaded[fieldName].push(result);
            }
        }

        req.cloudinaryFiles = uploaded;
        next();

    } catch (error) {
        console.error("❌ Error en uploadToCloudinaryMultiple:", error);
        next(error);
    }
}

module.exports = {
    uploadProduct,
    uploadToCloudinaryMultiple
};
