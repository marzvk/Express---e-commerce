const mongoose = require('mongoose');
const key = require('./key');
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    products: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product'
        },
        title: String,
        platform: String,
        price: Number,
        key: {
            type: Schema.Types.ObjectId,
            ref: 'Key'
        }
    }],

    total: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },

    paymentMethod: {
        type: String,
        enum: ['simulated', 'stripe', 'mercadopago'],
        default: 'simulated'
    },

    paymentId: String

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Order', OrderSchema);
