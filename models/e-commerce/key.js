const { PLATFORMS } = require('../../config/platforms')

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const KeySchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },

    platform: {
        type: String,
        enum: PLATFORMS,
        required: true
    },

    key: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ['available', 'sold', 'reserved', 'revoked'],
        default: 'available',
        index: true
    },

    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    soldAt: {
        type: Date,
        default: null
    },

    order: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },

    uploadedAt: {
        type: Date,
        default: Date.now
    }


}, { timestamps: true });

// Índice compuesto (carrito y checkout)
KeySchema.index({ product: 1, platform: 1, status: 1 });

// Índice simple (admin, reportes, búsquedas por estado)
KeySchema.index({ status: 1 });

module.exports = mongoose.model('Key', KeySchema);