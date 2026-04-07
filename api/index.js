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
import connectDB from '../utils/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      // Development
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      // Production - Frontend
      'https://art-case-frontend-1gjb.vercel.app',
      // Productions - Any other frontend subdomain
    ];

    // Allow requests without origin (mobile apps, same-origin requests)
    if (!origin) {
      return callback(null, true);
    }

    // Allow Vercel frontend urls (pattern matching for any art-case-frontend.vercel.app subdomain)
    if (/https:\/\/art-case-frontend.*\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Allow localhost/127.0.0.1 for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // For production, check allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow any origin in development for easier testing
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    console.warn(`CORS request from origin: ${origin}`);
    callback(null, true); // Allow anyway, but log it for monitoring
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200,
  maxAge: 86400
};

// ✅ CHANGE: Added this line to handle preflight OPTIONS requests
app.options('/{*path}', cors(corsOptions));

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Database Connection Setup
// Middleware to ensure DB is connected
const connectDBMiddleware = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    next();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    res.status(503).json({
      message: 'Database is unavailable. Please check MONGO_URI and IP whitelist.',
      error: err.message
    });
  }
};

// Apply DB connection middleware to all API routes
app.use('/api', connectDBMiddleware);

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