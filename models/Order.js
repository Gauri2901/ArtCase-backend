import mongoose from 'mongoose';

const orderArtworkSchema = new mongoose.Schema(
  {
    artwork: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    category: {
      type: String,
      required: true,
      enum: ['Oil', 'Acrylic', 'Watercolor', 'Mixed Media'],
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      zip: {
        type: String,
        required: true,
        trim: true,
      },
    },
    payment: {
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        required: true,
        default: 'INR',
      },
      method: {
        type: String,
        required: true,
        default: 'Razorpay',
      },
      status: {
        type: String,
        required: true,
        enum: ['created', 'paid', 'failed'],
        default: 'paid',
      },
      razorpayOrderId: {
        type: String,
        required: true,
      },
      razorpayPaymentId: {
        type: String,
        required: true,
      },
    },
    artworks: {
      type: [orderArtworkSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one artwork is required for an order',
      },
    },
    unread: {
      type: Boolean,
      default: true,
    },
    placedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
