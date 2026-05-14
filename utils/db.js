import mongoose from 'mongoose';

/** 
 * Persistent connection logic for Serverless environments (like Vercel).
 * We cache the connection promise to prevent multiple simultaneous connection attempts.
 */
let cachedPromise = null;

const connectDB = async () => {
    // 1. If we already have an active connection, return it
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // 2. If a connection is already in progress, wait for it
    if (cachedPromise) {
        return cachedPromise;
    }

    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not defined in environment variables');
    }

    const opts = {
        bufferCommands: false, // Recommended for serverless
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of default 30s
        connectTimeoutMS: 5000,
    };

    try {
        console.log('Connecting to MongoDB...');
        cachedPromise = mongoose.connect(process.env.MONGO_URI, opts);
        
        const conn = await cachedPromise;
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        cachedPromise = null; // Reset promise on error so we can try again
        console.error('Error connecting to MongoDB:', error.message);
        throw error;
    }
};

export default connectDB;
