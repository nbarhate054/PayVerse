import express from 'express';
import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';
import { memoryUsers, memoryWallets } from './auth.js';

const router = express.Router();
export const memoryTransactions = [];

// Helper function to safely find User without throwing Cast to ObjectId failed
const findUserByIdentifier = async (identifier) => {
  if (!identifier) return null;
  const raw = identifier.toString().trim();
  const clean = raw.toLowerCase();

  const conditions = [
    { vpa: clean },
    { vpa: raw },
    { email: clean },
    { phone: raw },
    { username: clean },
    { payverseId: clean },
    { payverseId: raw },
    { payverseId: clean.endsWith('@payverse') ? clean : `${clean}@payverse` }
  ];

  if (mongoose.isValidObjectId(raw)) {
    conditions.push({ _id: raw });
  }

  return await User.findOne({ $or: conditions });
};

// GET /api/wallet/balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const rawUserId = req.user.userId;

    if (mongoose.connection.readyState === 1) {
      const user = await findUserByIdentifier(rawUserId);
      const userId = user ? user._id : (mongoose.isValidObjectId(rawUserId) ? rawUserId : null);

      if (!userId) {
        return res.json({ success: true, balance: 0, currency: 'INR' });
      }

      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, currency: 'INR' });
        await wallet.save();
      }

      return res.json({
        success: true,
        balance: wallet.balance,
        currency: wallet.currency,
        updatedAt: wallet.updatedAt
      });
    } else {
      let wallet = memoryWallets.find(w => w.userId === rawUserId);
      if (!wallet) {
        wallet = { userId: rawUserId, balance: 0, currency: 'INR', updatedAt: new Date() };
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
    const { receiverId, receiverPayverseId, receiverEmail, receiverPhone, recipient: recipientBody, amount } = req.body;
    const transferAmount = Number(amount);

    if (!transferAmount || isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid transfer amount greater than 0.' });
    }

    const rawSenderId = req.user.userId;
    const recipientInput = recipientBody || receiverId || receiverPayverseId || receiverEmail || receiverPhone;

    if (!recipientInput) {
      return res.status(400).json({ success: false, message: 'Recipient identifier is required.' });
    }

    if (mongoose.connection.readyState === 1) {
      // 1. Resolve Sender
      const senderUser = await findUserByIdentifier(rawSenderId);
      const senderUserId = senderUser ? senderUser._id : (mongoose.isValidObjectId(rawSenderId) ? rawSenderId : null);

      if (!senderUserId) {
        return res.status(400).json({ success: false, message: 'Sender account invalid or not found.' });
      }

      let senderWallet = await Wallet.findOne({ userId: senderUserId });
      if (!senderWallet) {
        senderWallet = new Wallet({ userId: senderUserId, balance: 0, currency: 'INR' });
        await senderWallet.save();
      }

      // 2. Resolve Recipient using multi-identifier query
      const receiverUser = await findUserByIdentifier(recipientInput);
      if (!receiverUser) {
        return res.status(404).json({ success: false, message: 'Recipient user not found.' });
      }

      if (receiverUser._id.toString() === senderUserId.toString()) {
        return res.status(400).json({ success: false, message: 'You cannot transfer money to yourself.' });
      }

      // 3. Balance Check
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

      // 4. Update Wallets
      let receiverWallet = await Wallet.findOne({ userId: receiverUser._id });
      if (!receiverWallet) {
        receiverWallet = new Wallet({ userId: receiverUser._id, balance: 0, currency: 'INR' });
      }

      senderWallet.balance -= transferAmount;
      senderWallet.updatedAt = new Date();
      await senderWallet.save();

      receiverWallet.balance += transferAmount;
      receiverWallet.updatedAt = new Date();
      await receiverWallet.save();

      // 5. Record Transaction
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
        message: `Successfully transferred ₹${transferAmount} to ${receiverUser.name} (${receiverUser.payverseId || receiverUser.phone})`,
        balance: senderWallet.balance,
        transaction: populatedTx
      });
    } else {
      // In-Memory Fallback
      let senderWallet = memoryWallets.find(w => w.userId === rawSenderId);
      if (!senderWallet) {
        senderWallet = { userId: rawSenderId, balance: 1000, currency: 'INR' };
        memoryWallets.push(senderWallet);
      }

      const cleanRec = recipientInput.toString().trim().toLowerCase();
      let receiverUser = memoryUsers.find(u =>
        u._id === recipientInput ||
        u.id === recipientInput ||
        u.payverseId?.toLowerCase() === cleanRec ||
        u.vpa?.toLowerCase() === cleanRec ||
        u.email?.toLowerCase() === cleanRec ||
        u.phone === cleanRec ||
        u.username?.toLowerCase() === cleanRec
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
        receiverWallet = { userId: receiverUser._id, balance: 0, currency: 'INR' };
        memoryWallets.push(receiverWallet);
      }

      senderWallet.balance -= transferAmount;
      receiverWallet.balance += transferAmount;

      const tx = {
        _id: new mongoose.Types.ObjectId().toString(),
        senderId: { _id: rawSenderId, name: 'Sender', payverseId: req.user.payverseId },
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

// POST /api/wallet/add-money, /api/wallet/add, /api/wallet/topup
const handleAddMoney = async (req, res) => {
  try {
    const { amount } = req.body;
    const addAmount = Number(amount);

    if (!addAmount || isNaN(addAmount) || addAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid amount greater than 0.' });
    }

    const rawUserId = req.user.id || req.user.userId || req.user._id;

    if (mongoose.connection.readyState === 1) {
      const user = await findUserByIdentifier(rawUserId);
      const userId = user ? user._id : (mongoose.isValidObjectId(rawUserId) ? rawUserId : null);

      if (!userId) {
        return res.status(400).json({ success: false, message: 'User account invalid or not found.' });
      }

      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, currency: 'INR' });
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
      let wallet = memoryWallets.find(w => w.userId === rawUserId);
      if (!wallet) {
        wallet = { userId: rawUserId, balance: 0, currency: 'INR' };
        memoryWallets.push(wallet);
      }

      wallet.balance += addAmount;
      const tx = {
        _id: new mongoose.Types.ObjectId().toString(),
        senderId: { _id: rawUserId, name: 'Self', payverseId: req.user.payverseId },
        receiverId: { _id: rawUserId, name: 'Self', payverseId: req.user.payverseId },
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
};

router.post('/add-money', authMiddleware, handleAddMoney);
router.post('/add', authMiddleware, handleAddMoney);
router.post('/topup', authMiddleware, handleAddMoney);

export default router;
