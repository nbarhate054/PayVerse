import express from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { memoryTransactions } from './wallet.js';

const router = express.Router();

// GET /api/transactions/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const rawUserId = req.user.userId;

    if (mongoose.connection.readyState === 1) {
      let userObjId = rawUserId;
      if (!mongoose.isValidObjectId(rawUserId)) {
        const cleanId = rawUserId.toString().trim().toLowerCase();
        const user = await User.findOne({
          $or: [
            { payverseId: cleanId },
            { email: cleanId },
            { phone: rawUserId },
            { username: cleanId },
            { vpa: cleanId }
          ]
        });
        if (user) userObjId = user._id;
      }

      if (!mongoose.isValidObjectId(userObjId)) {
        return res.json({ success: true, count: 0, transactions: [] });
      }

      const transactions = await Transaction.find({
        $or: [
          { senderId: userObjId },
          { receiverId: userObjId }
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
