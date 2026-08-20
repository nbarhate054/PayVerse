import express from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';
import { memoryTransactions } from './wallet.js';

const router = express.Router();

// GET /api/transactions/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (mongoose.connection.readyState === 1) {
      const transactions = await Transaction.find({
        $or: [
          { senderId: userId },
          { receiverId: userId }
        ]
      })
        .sort({ timestamp: -1 })
        .populate('senderId', 'name email phone payverseId')
        .populate('receiverId', 'name email phone payverseId');

      return res.json({
        success: true,
        count: transactions.length,
        transactions
      });
    } else {
      const userTxs = memoryTransactions.filter(t =>
        t.senderId?._id === userId ||
        t.senderId === userId ||
        t.receiverId?._id === userId ||
        t.receiverId === userId
      );

      return res.json({
        success: true,
        count: userTxs.length,
        transactions: userTxs
      });
    }
  } catch (error) {
    console.error('Fetch Transaction History Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching transaction history' });
  }
});

export default router;
