import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
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
      phone: {
        type: String,
        trim: true,
        default: '',
      },
      address: {
        type: String,
        trim: true,
        default: '',
      },
      city: {
        type: String,
        trim: true,
        default: '',
      },
      zip: {
        type: String,
        trim: true,
        default: '',
      },
      state: {
        type: String,
        trim: true,
        default: '',
      },
    },
    payment: {
      method: {
        type: String,
        required: true,
        default: 'Razorpay',
      },
      status: {
        type: String,
        required: true,
        default: 'paid',
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      currency: {
        type: String,
        required: true,
        default: 'INR',
      },
      razorpayOrderId: {
        type: String,
        default: '',
      },
      razorpayPaymentId: {
        type: String,
        default: '',
      },
    },
    pricing: {
      subtotal: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      discount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      shipping: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      total: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      currency: {
        type: String,
        required: true,
        default: 'INR',
      },
    },
    items: {
      type: [invoiceItemSchema],
      default: [],
    },
    pdf: {
      fileName: {
        type: String,
        required: true,
        default: '',
      },
      cloudinaryPublicId: {
        type: String,
        default: '',
      },
      url: {
        type: String,
        default: '',
      },
      bytes: {
        type: Number,
        min: 0,
        default: 0,
      },
      generatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Invoice', invoiceSchema);
