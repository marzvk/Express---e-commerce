
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { PLATFORMS } = require('../../config/platforms')

const ImageSchema = new mongoose.Schema({
  url: { type: String, required: false },
  public_id: { type: String, required: false }
});

const ProductSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  description: {
    type: String,
    required: true,
    maxlength: 2000
  },

  price: {
    type: Number,
    required: true,
    min: 0
  },

  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 99
  },

  finalPrice: {
    type: Number
  },

  platform: [{
    type: String,
    enum: PLATFORMS,
    required: true
  }],

  genre: [String],

  developer: {
    type: String,
    trim: true
  },

  publisher: {
    type: String,
    trim: true
  },

  releaseDate: {
    type: Date
  },

  images: {
    thumbnail: {
      type: ImageSchema,
      default: {
        url: "/images/placeholder-game.jpg",
        public_id: null
      }
    },
    cover: {
      type: ImageSchema,
      default: {
        url: "/images/placeholder-game.jpg",
        public_id: null
      }
    },
    screenshots: {
      type: [ImageSchema],
      default: []
    }
  },

  tags: [String],

  featured: {
    type: Boolean,
    default: false
  },

  active: {
    type: Boolean,
    default: true
  },

  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },

  stock: {
    type: Number,
    default: 0,
    min: 0
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calcula precio final automáticamente antes de guardar
ProductSchema.pre('save', function (next) {
  this.finalPrice = this.price * (1 - this.discount / 100);
  next();
});

// Virtual para URL
ProductSchema.virtual('url').get(function () {
  return `/products/${this.slug}`;
});

// Método para generar slug automáticamente
ProductSchema.methods.generateSlug = function () {
  return this.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

module.exports = mongoose.model('Product', ProductSchema);