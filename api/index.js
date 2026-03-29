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

// CORS Configuration
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin
    if (!origin) {
      return callback(null, true);
    }

    // Allow frontend URL
    if (origin === 'https://art-case-frontend-1gjb.vercel.app') {
      return callback(null, true);
    }

    // Allow localhost for development
    if (origin === 'http://localhost:5173' || origin === 'http://localhost:3000') {
      return callback(null, true);
    }

    // Allow all Vercel deployments matching pattern
    if (/^https:\/\/art-case-frontend.*\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    console.log(`CORS blocked: ${origin}`);
    callback(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200,
  maxAge: 86400
};

// Middleware
app.use(cors(corsOptions));
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
