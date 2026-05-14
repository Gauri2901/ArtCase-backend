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
import userRoutes from '../routes/userRoutes.js';
import reviewRoutes from '../routes/reviewRoutes.js';
import connectDB from '../utils/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const normalizeOrigin = (value) => value?.trim().replace(/\/$/, '');

const localOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_PREVIEW_URL,
  'https://art-case-frontend.vercel.app',
].map(normalizeOrigin).filter(Boolean);

const allowedOrigins = new Set([...localOrigins, ...configuredOrigins]);

const vercelPreviewPattern = /^https:\/\/art-case-frontend(?:-[a-z0-9-]+)?\.vercel\.app$/i;

const isAllowedOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);

  if (!normalizedOrigin) {
    return true;
  }

  if (allowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  if (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1')) {
    return true;
  }

  if (vercelPreviewPattern.test(normalizedOrigin)) {
    return true;
  }

  return process.env.NODE_ENV === 'development';
};

// CORS Configuration
const corsOptions = {
  origin: function(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS request from origin: ${origin}`);
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200,
  maxAge: 86400
};

app.use((req, res, next) => {
  if (req.method !== 'OPTIONS') {
    return next();
  }

  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }

  return res.status(200).end();
});

// Middleware
app.use(cors(corsOptions)); // This handles preflight (OPTIONS) automatically
app.options(/.*/, cors(corsOptions));
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

    const origin = req.headers.origin;
    if (isAllowedOrigin(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    
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
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);

// Static Folder for Images
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Call connectDB immediately to provide logs on startup
connectDB().catch(err => console.error('Initial DB connection failed:', err.message));

// Generic Error Handler to ensure CORS headers are sent on 500 errors
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start Server
export default app;
