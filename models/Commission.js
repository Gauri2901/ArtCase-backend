import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['unpaid', 'paid', 'failed'],
      default: 'unpaid',
    },
    paymentLink: {
      type: String,
      default: '',
      trim: true,
    },
    paymentOrderId: {
      type: String,
      default: '',
      trim: true,
    },
    paymentId: {
      type: String,
      default: '',
      trim: true,
    },
    linkSentAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const commissionHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'payment_pending', 'paid', 'rejected', 'in_progress', 'completed'],
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const commissionSchema = new mongoose.Schema(
  {
    commissionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
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
    },
    artworkType: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    sizeDetails: {
      type: String,
      required: true,
      trim: true,
    },
    referenceImages: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'payment_pending', 'paid', 'rejected', 'in_progress', 'completed'],
      default: 'pending',
    },
    adminNotes: {
      type: String,
      trim: true,
      default: '',
    },
    quotedPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    unread: {
      type: Boolean,
      default: true,
    },
    payment: {
      type: paymentSchema,
      default: () => ({
        status: 'unpaid',
        paymentLink: '',
        paymentOrderId: '',
        paymentId: '',
        linkSentAt: null,
        paidAt: null,
      }),
    },
    convertedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    history: {
      type: [commissionHistorySchema],
      default: [{ status: 'pending', note: 'Commission submitted.' }],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Commission', commissionSchema);
