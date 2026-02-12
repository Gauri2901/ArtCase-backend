import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import { protect, admin } from '../middleware/authMiddleware.js';

dotenv.config();

const router = express.Router();

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Configure Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'artcase_gallery', // The folder name in your Cloudinary console
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage });

// 3. Update the Route
router.post('/', protect, admin, upload.single('image'), (req, res) => {
  // Cloudinary returns the direct URL in req.file.path
  res.json({ 
    message: 'Image uploaded', 
    imageUrl: req.file.path 
  });
});

router.post('/bulk', protect, admin, upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }
  
  const imageUrls = req.files.map(file => file.path);
  
  res.json({ 
    message: 'Images uploaded successfully', 
    imageUrls 
  });
});
export default router;