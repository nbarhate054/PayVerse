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

  return await User.findOne({ $or: conditions }).lean();
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

      let wallet = await Wallet.findOne({ userId }).lean();
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

// POST /api/wallet/transfer and /api/wallet/send
export const handleTransfer = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const senderId = req.user?._id || req.user?.id || req.user?.userId || req.user?.payverseId || req.user?.phone || req.user?.email || req.body?.senderId || req.body?.userId || req.body?.sender;
    const { amount, recipient, receiver: reqReceiver, receiverId, receiverPayverseId, receiverEmail, receiverPhone, recipientId, recipientPhone, to, phone: reqPhone, pin } = req.body || {};
    const recipientInput = recipientId || recipientPhone || recipient || reqReceiver || receiverId || receiverPayverseId || receiverEmail || receiverPhone || reqPhone || to;
    const numAmount = Number(amount);

    if (!recipientInput || !numAmount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount or recipient" });
    }

    if (pin !== undefined && pin !== null) {
      const cleanPin = pin.toString().trim();
      if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
        return res.status(400).json({ success: false, message: 'Invalid 4-digit PIN.' });
      }
    }

    if (mongoose.connection.readyState === 1) {
      // Find sender
      let sender = null;
      if (mongoose.isValidObjectId(senderId)) {
        sender = await User.findById(senderId);
      }
      if (!sender && senderId) {
        const cleanSenderStr = senderId.toString().trim();
        sender = await findUserByIdentifier(cleanSenderStr) || await User.findOne({
          $or: [
            { payverseId: cleanSenderStr },
            { email: cleanSenderStr.toLowerCase() },
            { phone: cleanSenderStr }
          ]
        });
      }

      const senderObjId = sender ? sender._id : (mongoose.isValidObjectId(senderId) ? senderId : null);

      if (!senderObjId) {
        return res.status(400).json({ success: false, message: "Sender not found" });
      }

      // Find recipient safely by phone (recipientPhone or recipientInput), payverseId, email, name, or _id
      let recipientUser = null;
      const targetQuery = (recipientPhone || recipientInput || '').toString().trim();

      if (targetQuery) {
        const digitsOnly = targetQuery.replace(/\D/g, '');
        const cleanLower = targetQuery.toLowerCase();

        const conditions = [
          { payverseId: cleanLower },
          { payverseId: cleanLower.endsWith('@payverse') ? cleanLower : `${cleanLower}@payverse` },
          { phone: targetQuery },
          { phone: targetQuery.startsWith('+91') ? targetQuery : `+91${targetQuery}` },
          { phone: targetQuery.replace(/^\+91/, '').trim() },
          { email: cleanLower }
        ];

        if (digitsOnly && digitsOnly.length >= 10) {
          const tenDigits = digitsOnly.slice(-10);
          conditions.push({ phone: new RegExp(tenDigits + '$') });
        }

        if (mongoose.isValidObjectId(targetQuery)) {
          conditions.push({ _id: targetQuery });
        } else {
          const escapedRec = targetQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          conditions.push({ name: new RegExp('^' + escapedRec + '$', 'i') });
        }

        recipientUser = await User.findOne({ $or: conditions });
      }

      if (!recipientUser && recipientInput) {
        recipientUser = await findUserByIdentifier(recipientInput);
      }

      if (!recipientUser) {
        return res.status(404).json({ success: false, message: "No PayVerse account found with this recipient details." });
      }

      const receiver = recipientUser;
      const receiverUser = recipientUser;

      if (recipientUser._id.toString() === senderObjId.toString()) {
        return res.status(400).json({ success: false, message: "You cannot transfer money to yourself." });
      }

      // Check sender wallet
      let senderWallet = await Wallet.findOne({ userId: senderObjId });
      if (!senderWallet) {
        senderWallet = new Wallet({ userId: senderObjId, balance: 1000, currency: 'INR' });
        await senderWallet.save();
      }

      const senderName = sender?.name || req.user?.name || 'Sender';
      const senderPhoneVal = sender?.phone || req.user?.phone || sender?.payverseId || 'Sender';

      const recipientName = recipientUser.name || 'Recipient';
      const recipientPhoneVal = recipientUser.phone || recipientUser.payverseId || 'Recipient';

      if (senderWallet.balance < numAmount) {
        const failedTx = new Transaction({
          userId: senderObjId,
          senderId: senderObjId,
          receiverId: recipientUser._id,
          sender: senderPhoneVal,
          senderName: senderName,
          recipient: recipientPhoneVal,
          recipientName: recipientName,
          amount: numAmount,
          type: 'transfer',
          status: 'failed',
          timestamp: new Date()
        });
        await failedTx.save();

        return res.status(400).json({ success: false, message: "Insufficient balance", balance: senderWallet.balance });
      }

      // Check / Create recipient wallet
      let recipientWallet = await Wallet.findOne({ userId: recipientUser._id });
      if (!recipientWallet) {
        recipientWallet = new Wallet({ userId: recipientUser._id, balance: 0, currency: 'INR' });
      }

      // Execute Transfer
      senderWallet.balance -= numAmount;
      senderWallet.updatedAt = new Date();

      recipientWallet.balance += numAmount;
      recipientWallet.updatedAt = new Date();

      await senderWallet.save();
      await recipientWallet.save();

      // Create Transaction Document
      const tx = new Transaction({
        userId: senderObjId,
        senderId: senderObjId,
        receiverId: recipientUser._id,
        sender: senderPhoneVal,
        senderName: senderName,
        recipient: recipientPhoneVal,
        recipientName: recipientName,
        amount: numAmount,
        type: 'transfer',
        status: 'completed',
        title: `Sent to ${recipientName}`,
        description: `Transferred ₹${numAmount} to ${recipientName}`,
        timestamp: new Date()
      });
      await tx.save();
      console.log(">>> TX SAVED TO ATLAS DB:", tx._id);

      const populatedTx = await Transaction.findById(tx._id)
        .populate('senderId', 'name email phone payverseId')
        .populate('receiverId', 'name email phone payverseId');

      return res.status(200).json({
        success: true,
        message: `₹${numAmount} transferred successfully to ${recipientName}`,
        balance: senderWallet.balance,
        newBalance: senderWallet.balance,
        transaction: populatedTx || tx
      });
    } else {
      // In-Memory Fallback
      let senderWallet = memoryWallets.find(w => w.userId === senderId);
      if (!senderWallet) {
        senderWallet = { userId: senderId, balance: 5000, currency: 'INR' };
        memoryWallets.push(senderWallet);
      }

      const cleanRec = (recipientInput || '').toString().trim().toLowerCase();
      let recipientUser = memoryUsers.find(u =>
        u._id === recipientInput ||
        u.id === recipientInput ||
        u.payverseId?.toLowerCase() === cleanRec ||
        u.vpa?.toLowerCase() === cleanRec ||
        u.email?.toLowerCase() === cleanRec ||
        u.phone === cleanRec ||
        u.username?.toLowerCase() === cleanRec ||
        u.name?.toLowerCase() === cleanRec
      );

      if (!recipientUser) {
        recipientUser = { _id: 'rec_demo', id: cleanRec || 'demo@payverse', name: cleanRec || 'Recipient', payverseId: cleanRec || 'demo@payverse', phone: recipientPhone || '9975342924' };
      }
      const receiver = recipientUser;
      const receiverUser = recipientUser;

      if (senderWallet.balance < numAmount) {
        return res.status(400).json({ success: false, message: "Insufficient balance", balance: senderWallet.balance });
      }

      let recipientWallet = memoryWallets.find(w => w.userId === recipientUser._id);
      if (!recipientWallet) {
        recipientWallet = { userId: recipientUser._id, balance: 0, currency: 'INR' };
        memoryWallets.push(recipientWallet);
      }

      senderWallet.balance -= numAmount;
      recipientWallet.balance += numAmount;

      const tx = {
        _id: new mongoose.Types.ObjectId().toString(),
        senderId: { _id: senderId, name: 'Sender', payverseId: req.user?.payverseId || 'user@payverse' },
        receiverId: { _id: recipientUser._id, name: recipientUser.name, payverseId: recipientUser.payverseId || 'rec@payverse' },
        amount: numAmount,
        type: 'transfer',
        status: 'success',
        timestamp: new Date()
      };
      memoryTransactions.push(tx);

      return res.status(200).json({
        success: true,
        message: `₹${numAmount} transferred successfully to ${recipientUser.name}`,
        balance: senderWallet.balance,
        newBalance: senderWallet.balance,
        transaction: tx
      });
    }
  } catch (error) {
    console.error("Transfer error:", error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, message: error.message });
  }
};

router.post('/transfer', authMiddleware, handleTransfer);
router.post('/send', authMiddleware, handleTransfer);

// POST /api/wallet/add-money, /api/wallet/add, /api/wallet/topup
const handleAddMoney = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { amount } = req.body || {};
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
        userId: userId,
        senderId: userId,
        receiverId: userId,
        sender: user?.phone || user?.email || 'Bank',
        senderName: 'Bank / UPI Top-Up',
        recipient: user?.phone || user?.email || 'Self',
        recipientName: user?.name || 'Self',
        amount: addAmount,
        type: 'credit',
        status: 'completed',
        title: 'Money Added',
        description: 'Added to PayVerse wallet',
        timestamp: new Date()
      });
      await transaction.save();
      console.log(">>> TX SAVED TO ATLAS DB:", transaction._id);

      const populatedTx = await Transaction.findById(transaction._id)
        .populate('senderId', 'name email phone payverseId')
        .populate('receiverId', 'name email phone payverseId');

      return res.status(200).json({
        success: true,
        message: 'Money added successfully',
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
        senderId: { _id: rawUserId, name: 'Self', payverseId: req.user?.payverseId || 'user@payverse' },
        receiverId: { _id: rawUserId, name: 'Self', payverseId: req.user?.payverseId || 'user@payverse' },
        amount: addAmount,
        type: 'add_money',
        status: 'success',
        timestamp: new Date()
      };
      memoryTransactions.push(tx);

      return res.status(200).json({
        success: true,
        message: 'Money added successfully',
        balance: wallet.balance,
        transaction: tx
      });
    }
  } catch (error) {
    console.error('Add Money Error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, message: error.message || 'Error adding money to wallet', error: error.message });
  }
};

router.post('/add-money', authMiddleware, handleAddMoney);
router.post('/add', authMiddleware, handleAddMoney);
router.post('/topup', authMiddleware, handleAddMoney);

export default router;
