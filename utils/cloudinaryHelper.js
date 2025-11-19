/**
 * Extrae el public_id de una URL de Cloudinary
 * Ejemplo: https://res.cloudinary.com/demo/image/upload/v1234/folder/image.jpg
 * Retorna: folder/image
 */
exports.getPublicIdFromUrl = (url) => {
    if (!url || url.includes('placeholder')) return null;

    try {
        // Buscar la palabra "upload" en la URL
        const uploadIndex = url.indexOf('/upload/');
        if (uploadIndex === -1) return null;

        // Extraer la parte después de /upload/v123456/
        const afterUpload = url.substring(uploadIndex + 8); // +8 para saltar "/upload/"

        // Eliminar el número de versión (v123456/) si existe
        const withoutVersion = afterUpload.replace(/^v\d+\//, '');

        // Quitar la extensión del archivo
        const publicId = withoutVersion.substring(0, withoutVersion.lastIndexOf('.'));

        return publicId;
    } catch (err) {
        console.error('❌ Error extrayendo public_id:', err.message);
        return null;
    }
};


const cloudinary = require('../config/cloudinary');

async function deleteCloudinaryImage(publicId) {
    if (!publicId) return;

    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.error("❌ Error eliminando imagen Cloudinary:", err);
    }
}

module.exports = { deleteCloudinaryImage };

/**
 * Genera URL optimizada de Cloudinary según el contexto
 * @param {String} url - URL original de Cloudinary
 * @param {String} type - Tipo de optimización (thumbnail, cover, hero, tiny)
 */
exports.getOptimizedImageUrl = (url, type = 'thumbnail') => {
    if (!url || url.includes('placeholder')) return url;

    const transformations = {
        thumbnail: 'w_400,h_300,c_fill,q_auto,f_auto',
        cover: 'w_800,h_600,c_fill,q_auto,f_auto',
        hero: 'w_1200,h_675,c_fill,q_auto,f_auto',
        tiny: 'w_100,h_100,c_fill,q_auto,f_auto'
    };

    const transform = transformations[type] || transformations.thumbnail;

    // Reemplazar /upload/ por /upload/{transformaciones}/
    return url.replace('/upload/', `/upload/${transform}/`);
};