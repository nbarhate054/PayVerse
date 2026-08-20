import express from 'express';
import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';
import { memoryUsers, memoryWallets } from './auth.js';

const router = express.Router();
export const memoryTransactions = [];

// GET /api/wallet/balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (mongoose.connection.readyState === 1) {
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 1000, currency: 'INR' });
        await wallet.save();
      }

      return res.json({
        success: true,
        balance: wallet.balance,
        currency: wallet.currency,
        updatedAt: wallet.updatedAt
      });
    } else {
      let wallet = memoryWallets.find(w => w.userId === userId);
      if (!wallet) {
        wallet = { userId, balance: 1000, currency: 'INR', updatedAt: new Date() };
        memoryWallets.push(wallet);
      }

      return res.json({
        success: true,
        balance: wallet.balance,
        currency: wallet.currency,
        updatedAt: wallet.updatedAt
      });
    }
  } catch (error) {
    console.error('Fetch Balance Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching wallet balance' });
  }
});

// POST /api/wallet/transfer
router.post('/transfer', authMiddleware, async (req, res) => {
  try {
    const { receiverId, receiverPayverseId, receiverEmail, receiverPhone, amount } = req.body;
    const transferAmount = Number(amount);

    if (!transferAmount || isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid transfer amount greater than 0.' });
    }

    const senderUserId = req.user.userId;

    if (mongoose.connection.readyState === 1) {
      let senderWallet = await Wallet.findOne({ userId: senderUserId });
      if (!senderWallet) {
        senderWallet = new Wallet({ userId: senderUserId, balance: 1000, currency: 'INR' });
        await senderWallet.save();
      }

      const recipientQuery = [];
      if (receiverId) recipientQuery.push({ _id: receiverId });
      if (receiverPayverseId) recipientQuery.push({ payverseId: receiverPayverseId.trim().toLowerCase() });
      if (receiverEmail) recipientQuery.push({ email: receiverEmail.trim().toLowerCase() });
      if (receiverPhone) recipientQuery.push({ phone: receiverPhone.trim() });

      if (receiverId && typeof receiverId === 'string' && (receiverId.includes('@') || receiverId.length < 24)) {
        const cleanRec = receiverId.trim().toLowerCase();
        const recIdWithTag = cleanRec.includes('@payverse') ? cleanRec : `${cleanRec}@payverse`;
        recipientQuery.push({ payverseId: recIdWithTag });
        recipientQuery.push({ email: cleanRec });
        recipientQuery.push({ phone: cleanRec });
      }

      const receiverUser = await User.findOne({ $or: recipientQuery });
      if (!receiverUser) {
        return res.status(404).json({ success: false, message: 'Recipient user not found.' });
      }

      if (receiverUser._id.toString() === senderUserId.toString()) {
        return res.status(400).json({ success: false, message: 'You cannot transfer money to yourself.' });
      }

      if (senderWallet.balance < transferAmount) {
        const failedTransaction = new Transaction({
          senderId: senderUserId,
          receiverId: receiverUser._id,
          amount: transferAmount,
          type: 'transfer',
          status: 'failed',
          timestamp: new Date()
        });
        await failedTransaction.save();

        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance. Available balance: ₹${senderWallet.balance}`,
          balance: senderWallet.balance
        });
      }

      let receiverWallet = await Wallet.findOne({ userId: receiverUser._id });
      if (!receiverWallet) {
        receiverWallet = new Wallet({ userId: receiverUser._id, balance: 1000, currency: 'INR' });
      }

      senderWallet.balance -= transferAmount;
      senderWallet.updatedAt = new Date();
      await senderWallet.save();

      receiverWallet.balance += transferAmount;
      receiverWallet.updatedAt = new Date();
      await receiverWallet.save();

      const transaction = new Transaction({
        senderId: senderUserId,
        receiverId: receiverUser._id,
        amount: transferAmount,
        type: 'transfer',
        status: 'success',
        timestamp: new Date()
      });
      await transaction.save();

      const populatedTx = await Transaction.findById(transaction._id)
        .populate('senderId', 'name email phone payverseId')
        .populate('receiverId', 'name email phone payverseId');

      return res.json({
        success: true,
        message: `Successfully transferred ₹${transferAmount} to ${receiverUser.name} (${receiverUser.payverseId})`,
        balance: senderWallet.balance,
        transaction: populatedTx
      });
    } else {
      let senderWallet = memoryWallets.find(w => w.userId === senderUserId);
      if (!senderWallet) {
        senderWallet = { userId: senderUserId, balance: 1000, currency: 'INR' };
        memoryWallets.push(senderWallet);
      }

      const cleanRec = (receiverPayverseId || receiverId || receiverEmail || receiverPhone || '').toString().trim().toLowerCase();
      let receiverUser = memoryUsers.find(u =>
        u._id === receiverId ||
        u.id === receiverId ||
        u.payverseId?.toLowerCase() === cleanRec ||
        u.email?.toLowerCase() === cleanRec ||
        u.phone === cleanRec
      );

      if (!receiverUser) {
        receiverUser = { _id: 'rec_demo', id: cleanRec || 'demo@payverse', name: cleanRec || 'Recipient', payverseId: cleanRec || 'demo@payverse' };
      }

      if (senderWallet.balance < transferAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance. Available balance: ₹${senderWallet.balance}`,
          balance: senderWallet.balance
        });
      }

      let receiverWallet = memoryWallets.find(w => w.userId === receiverUser._id);
      if (!receiverWallet) {
        receiverWallet = { userId: receiverUser._id, balance: 1000, currency: 'INR' };
        memoryWallets.push(receiverWallet);
      }

      senderWallet.balance -= transferAmount;
      receiverWallet.balance += transferAmount;

      const tx = {
        _id: new mongoose.Types.ObjectId().toString(),
        senderId: { _id: senderUserId, name: 'Sender', payverseId: req.user.payverseId },
        receiverId: { _id: receiverUser._id, name: receiverUser.name, payverseId: receiverUser.payverseId },
        amount: transferAmount,
        type: 'transfer',
        status: 'success',
        timestamp: new Date()
      };
      memoryTransactions.push(tx);

      return res.json({
        success: true,
        message: `Successfully transferred ₹${transferAmount} to ${receiverUser.name}`,
        balance: senderWallet.balance,
        transaction: tx
      });
    }
  } catch (error) {
    console.error('Transfer Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error processing money transfer' });
  }
});

// POST /api/wallet/add-money
router.post('/add-money', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    const addAmount = Number(amount);

    if (!addAmount || isNaN(addAmount) || addAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid amount greater than 0.' });
    }

    const userId = req.user.userId;

    if (mongoose.connection.readyState === 1) {
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 1000, currency: 'INR' });
      }

      wallet.balance += addAmount;
      wallet.updatedAt = new Date();
      await wallet.save();

      const transaction = new Transaction({
        senderId: userId,
        receiverId: userId,
        amount: addAmount,
        type: 'add_money',
        status: 'success',
        timestamp: new Date()
      });
      await transaction.save();

      const populatedTx = await Transaction.findById(transaction._id)
        .populate('senderId', 'name email phone payverseId')
        .populate('receiverId', 'name email phone payverseId');

      return res.json({
        success: true,
        message: `Successfully added ₹${addAmount} to your wallet!`,
        balance: wallet.balance,
        transaction: populatedTx
      });
    } else {
      let wallet = memoryWallets.find(w => w.userId === userId);
      if (!wallet) {
        wallet = { userId, balance: 1000, currency: 'INR' };
        memoryWallets.push(wallet);
      }

      wallet.balance += addAmount;
      const tx = {
        _id: new mongoose.Types.ObjectId().toString(),
        senderId: { _id: userId, name: 'Self', payverseId: req.user.payverseId },
        receiverId: { _id: userId, name: 'Self', payverseId: req.user.payverseId },
        amount: addAmount,
        type: 'add_money',
        status: 'success',
        timestamp: new Date()
      };
      memoryTransactions.push(tx);

      return res.json({
        success: true,
        message: `Successfully added ₹${addAmount} to your wallet!`,
        balance: wallet.balance,
        transaction: tx
      });
    }
  } catch (error) {
    console.error('Add Money Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error adding money to wallet' });
  }
});

export default router;
