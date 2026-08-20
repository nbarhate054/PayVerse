import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'node:dns';

// Fix DNS SRV resolution for MongoDB Atlas on Windows environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('Could not set custom DNS servers:', e.message);
}

import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import transactionRoutes from './routes/transaction.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://payverse_admin:Payverse123@cluster0.pbs3sz9.mongodb.net/payverse?retryWrites=true&w=majority&appName=Cluster0';

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'PayVerse Backend API Server Running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dbHost: mongoose.connection.host || 'none'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);

// Connect DB with automatic fallback
const connectDB = async () => {
  try {
    console.log('Attempting connection to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('✅ Connected to MongoDB Atlas successfully!');
  } catch (err) {
    console.warn('⚠️ MongoDB Atlas connection error:', err.message);
    console.log('🔄 Launching fallback Mongo instance...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to In-Memory MongoDB Fallback Database at:', mongoUri);
    } catch (memErr) {
      console.error('❌ MongoDB Fallback Error:', memErr.message);
    }
  }
};

connectDB();

app.listen(PORT, () => {
  console.log(`🚀 PayVerse Backend Server listening on http://localhost:${PORT}`);
});
