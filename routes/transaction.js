import express from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { memoryTransactions, handleTransfer } from './wallet.js';

const router = express.Router();

const handleGetTransactions = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const rawUserId = req.user.userId || req.user._id || req.user.id;

    if (mongoose.connection.readyState === 1) {
      let userObjId = rawUserId;
      let userObj = null;
      if (mongoose.isValidObjectId(rawUserId)) {
        userObj = await User.findById(rawUserId);
      } else {
        const cleanId = rawUserId.toString().trim().toLowerCase();
        userObj = await User.findOne({
          $or: [
            { payverseId: cleanId },
            { email: cleanId },
            { phone: rawUserId },
            { username: cleanId },
            { vpa: cleanId }
          ]
        });
      }
      if (userObj) userObjId = userObj._id;

      const userPhone = userObj?.phone || req.user.phone;
      const userEmail = userObj?.email || req.user.email;
      const userPayverseId = userObj?.payverseId || req.user.payverseId;

      const orConditions = [];
      if (userObjId && mongoose.isValidObjectId(userObjId)) {
        orConditions.push({ userId: userObjId });
        orConditions.push({ senderId: userObjId });
        orConditions.push({ receiverId: userObjId });
      }
      if (userPhone) {
        orConditions.push({ sender: userPhone });
        orConditions.push({ recipient: userPhone });
      }
      if (userEmail) {
        orConditions.push({ sender: userEmail });
        orConditions.push({ recipient: userEmail });
      }
      if (userPayverseId) {
        orConditions.push({ sender: userPayverseId });
        orConditions.push({ recipient: userPayverseId });
      }

      const transactions = await Transaction.find(orConditions.length > 0 ? { $or: orConditions } : {})
        .sort({ createdAt: -1, timestamp: -1 })
        .populate('senderId', 'name email phone payverseId')
        .populate('receiverId', 'name email phone payverseId')
        .lean();

      return res.status(200).json({
        success: true,
        count: transactions.length,
        transactions
      });
    } else {
      const userTxs = memoryTransactions.filter(t =>
        t.userId === rawUserId ||
        t.senderId?._id === rawUserId ||
        t.senderId === rawUserId ||
        t.receiverId?._id === rawUserId ||
        t.receiverId === rawUserId
      );

      return res.status(200).json({
        success: true,
        count: userTxs.length,
        transactions: userTxs
      });
    }
  } catch (error) {
    console.error('Fetch Transactions Error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, message: error.message || 'Error fetching transaction history' });
  }
};

router.get('/', authMiddleware, handleGetTransactions);
router.get('/history', authMiddleware, handleGetTransactions);
router.post('/send', authMiddleware, handleTransfer);

export default router;
