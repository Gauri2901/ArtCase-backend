import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Routes
import productRoutes from '../routes/productRoutes.js';
import authRoutes from '../routes/authRoutes.js';
import uploadRoutes from '../routes/uploadRoutes.js';
import paymentRoutes from '../routes/paymentRoutes.js';
import orderRoutes from '../routes/orderRoutes.js';
import logRoutes from '../routes/logRoutes.js';
import adminRoutes from '../routes/adminRoutes.js';
import commissionRoutes from '../routes/commissionRoutes.js';
import notificationRoutes from '../routes/notificationRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_PREVIEW_URL,
  'http://localhost:5173',
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (configuredOrigins.includes(origin)) {
    return true;
  }

  return /^https:\/\/art-case-frontend-[a-z0-9-]+\.vercel\.app$/i.test(origin);
};

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());

// Database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

// Mounting Routes
app.use('/api/products', productRoutes);
app.use('/api/artworks', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/notifications', notificationRoutes);

// Static Folder for Images
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Start Server
export default app;
