import mongoose from 'mongoose';

const changeSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
      trim: true,
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { _id: false }
);

const uploadLogSchema = new mongoose.Schema(
  {
    artwork: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    artworkTitle: {
      type: String,
      required: true,
      trim: true,
    },
    artworkType: {
      type: String,
      required: true,
      enum: ['Oil', 'Acrylic', 'Watercolor', 'Mixed Media'],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['created', 'updated', 'deleted'],
    },
    changes: {
      type: [changeSchema],
      default: [],
    },
    summary: {
      type: String,
      trim: true,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('UploadLog', uploadLogSchema);
