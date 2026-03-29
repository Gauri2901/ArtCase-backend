import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import { admin, protect } from '../middleware/authMiddleware.js';
import {
  createCommission,
  createCommissionPaymentOrder,
  getCommissions,
  getMyCommissions,
  updateCommission,
  verifyCommissionPayment,
} from '../controllers/commissionController.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'artcase_commissions',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage });
const router = express.Router();

router.post('/', protect, createCommission);
router.post('/upload-references', upload.array('references', 6), (req, res) => {
  const referenceImages = Array.isArray(req.files) ? req.files.map((file) => file.path) : [];

  res.json({
    message: 'Reference images uploaded successfully.',
    referenceImages,
  });
});
router.get('/mine', protect, getMyCommissions);
router.post('/:id/create-payment-order', protect, createCommissionPaymentOrder);
router.post('/:id/verify-payment', protect, verifyCommissionPayment);
router.get('/', protect, admin, getCommissions);
router.patch('/:id', protect, admin, updateCommission);

export default router;
