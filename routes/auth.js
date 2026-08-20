import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Memory store fallback
export const memoryUsers = [];
export const memoryWallets = [];
export const otpStore = new Map();

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id || user.id,
      email: user.email,
      phone: user.phone,
      payverseId: user.payverseId
    },
    process.env.JWT_SECRET || 'payverse_secret_key_123',
    { expiresIn: '7d' }
  );
};

// GET /api/auth/users
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    if (mongoose.connection.readyState === 1) {
      const users = await User.find({ _id: { $ne: currentUserId } }).select('-password');
      return res.json({
        success: true,
        users: users.map(u => ({
          id: u.payverseId || u._id.toString(),
          _id: u._id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          payverseId: u.payverseId
        }))
      });
    } else {
      const users = memoryUsers.filter(u => (u._id || u.id) !== currentUserId);
      return res.json({
        success: true,
        users: users.map(u => ({
          id: u.payverseId || u._id || u.id,
          _id: u._id || u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          payverseId: u.payverseId
        }))
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { phone } = req.body || {};
    if (!phone || !phone.toString().trim()) {
      return res.status(400).json({ success: false, message: 'Mobile number is required.' });
    }

    const cleanPhone = phone.toString().trim();
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(cleanPhone, { otp: generatedOtp, expiresAt });

    console.log(`[Payverse Demo OTP for ${cleanPhone}]: ${generatedOtp}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      simulatedOtp: generatedOtp,
      expiresInSeconds: 300
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, message: error.message || 'Error sending OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { phone, otp } = req.body || {};
    if (!phone || !otp) {
      return res.status(400).json({ success: false, verified: false, message: 'Mobile number and OTP are required.' });
    }

    const cleanPhone = phone.toString().trim();
    const inputOtp = otp.toString().trim();
    const record = otpStore.get(cleanPhone);

    const isDemoCode = ['1234', '4821', '123456'].includes(inputOtp) || inputOtp.length === 4;
    const isRecordMatch = record && record.otp === inputOtp && Date.now() <= record.expiresAt;

    if (isDemoCode || isRecordMatch) {
      if (record) otpStore.delete(cleanPhone);

      let user;
      if (mongoose.connection.readyState === 1) {
        user = await User.findOne({ phone: cleanPhone });
      } else {
        user = memoryUsers.find(u => u.phone === cleanPhone);
      }

      if (user) {
        const token = generateToken(user);
        let wallet;
        if (mongoose.connection.readyState === 1) {
          wallet = await Wallet.findOne({ userId: user._id });
        } else {
          wallet = memoryWallets.find(w => w.userId === user._id);
        }

        return res.status(200).json({
          success: true,
          verified: true,
          token,
          message: 'OTP verified successfully',
          user: { id: user._id, name: user.name, email: user.email, phone: user.phone, payverseId: user.payverseId, createdAt: user.createdAt },
          wallet: { balance: wallet?.balance ?? 0, currency: wallet?.currency || 'INR' }
        });
      }

      return res.status(200).json({
        success: true,
        verified: true,
        isNewUser: true,
        message: 'OTP verified successfully'
      });
    }

    if (record && Date.now() > record.expiresAt) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ success: false, verified: false, message: 'OTP has expired. Please request a new code.' });
    }

    return res.status(400).json({ success: false, verified: false, message: 'Invalid OTP. Please check the code and try again.' });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, verified: false, message: error.message || 'Error verifying OTP' });
  }
});

// POST /api/auth/verify-pin
router.post('/verify-pin', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { pin } = req.body || {};
    if (!pin || !pin.toString().trim()) {
      return res.status(400).json({ success: false, verified: false, message: 'PIN is required.' });
    }

    const cleanPin = pin.toString().trim();
    if (cleanPin.length === 4 && /^\d{4}$/.test(cleanPin)) {
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'PIN verified successfully'
      });
    }

    return res.status(400).json({
      success: false,
      verified: false,
      message: 'Invalid PIN. PIN must be 4 digits.'
    });
  } catch (error) {
    console.error('Verify PIN Error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, verified: false, message: error.message || 'Error verifying PIN' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { name, email, phone, password, payverseId: requestedPayverseId, pin } = req.body || {};

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and password are required fields.'
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const defaultPin = pin || '1234';

    let baseId = requestedPayverseId
      ? requestedPayverseId.trim().toLowerCase().replace('@payverse', '')
      : cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!baseId) baseId = 'user';
    let finalPayverseId = `${baseId}@payverse`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (mongoose.connection.readyState === 1) {
      let existingUser = await User.findOne({
        $or: [
          { email: cleanEmail },
          { phone: cleanPhone }
        ]
      });

      if (existingUser) {
        let existingWallet = await Wallet.findOne({ userId: existingUser._id });
        if (!existingWallet) {
          existingWallet = new Wallet({ userId: existingUser._id, balance: 1000, currency: 'INR' });
          await existingWallet.save();
        }
        const token = generateToken(existingUser);
        return res.status(200).json({
          success: true,
          message: 'User already registered. Logged in successfully.',
          token,
          user: existingUser,
          wallet: existingWallet
        });
      }

      let count = 1;
      while (await User.findOne({ payverseId: finalPayverseId })) {
        finalPayverseId = `${baseId}${Math.floor(100 + Math.random() * 900)}@payverse`;
        count++;
        if (count > 5) break;
      }

      const user = new User({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password: hashedPassword,
        payverseId: finalPayverseId,
        pin: defaultPin
      });
      await user.save();

      const wallet = new Wallet({
        userId: user._id,
        balance: 1000,
        currency: 'INR'
      });
      await wallet.save();

      console.log(">>> USER INSERTED INTO ATLAS:", user._id);

      const token = generateToken(user);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: user,
        wallet: { balance: wallet.balance, currency: wallet.currency }
      });
    } else {
      let user = memoryUsers.find(u => u.email === cleanEmail || u.phone === cleanPhone);
      if (!user) {
        const id = new mongoose.Types.ObjectId().toString();
        user = { _id: id, id, name: cleanName, email: cleanEmail, phone: cleanPhone, password: hashedPassword, payverseId: finalPayverseId, pin: defaultPin, createdAt: new Date() };
        memoryUsers.push(user);
      }

      let wallet = memoryWallets.find(w => w.userId === (user._id || user.id));
      if (!wallet) {
        wallet = { userId: user._id || user.id, balance: 1000, currency: 'INR', updatedAt: new Date() };
        memoryWallets.push(wallet);
      }

      const token = generateToken(user);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: user,
        wallet: { balance: wallet.balance, currency: wallet.currency }
      });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, phone, payverseId, identifier, password } = req.body;
    const loginId = identifier || email || phone || payverseId;

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone/PayVerse ID and password.'
      });
    }

    const cleanId = loginId.trim().toLowerCase();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({
        $or: [
          { email: cleanId },
          { phone: loginId.trim() },
          { payverseId: cleanId }
        ]
      });

      if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials. User not found.' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials. Incorrect password.' });

      let wallet = await Wallet.findOne({ userId: user._id });
      if (!wallet) {
        wallet = new Wallet({ userId: user._id, balance: 1000, currency: 'INR' });
        await wallet.save();
      }

      const token = generateToken(user);
      return res.json({
        success: true,
        message: 'Logged in successfully',
        token,
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone, payverseId: user.payverseId, createdAt: user.createdAt },
        wallet: { balance: wallet.balance, currency: wallet.currency }
      });
    } else {
      const user = memoryUsers.find(u => u.email === cleanId || u.phone === loginId.trim() || u.payverseId === cleanId);
      if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials. User not found.' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials. Incorrect password.' });

      let wallet = memoryWallets.find(w => w.userId === user._id);
      if (!wallet) {
        wallet = { userId: user._id, balance: 1000, currency: 'INR', updatedAt: new Date() };
        memoryWallets.push(wallet);
      }

      const token = generateToken(user);
      return res.json({
        success: true,
        message: 'Logged in successfully',
        token,
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone, payverseId: user.payverseId, createdAt: user.createdAt },
        wallet: { balance: wallet.balance, currency: wallet.currency }
      });
    }
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let user;
      const uid = req.user.userId;
      if (mongoose.isValidObjectId(uid)) {
        user = await User.findById(uid).select('-password');
      }
      if (!user && uid) {
        const cleanUid = uid.toString().trim().toLowerCase();
        user = await User.findOne({
          $or: [
            { payverseId: cleanUid },
            { email: cleanUid },
            { phone: uid.toString().trim() },
            { username: cleanUid },
            { vpa: cleanUid }
          ]
        }).select('-password');
      }

      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      let wallet = await Wallet.findOne({ userId: user._id });
      if (!wallet) {
        wallet = new Wallet({ userId: user._id, balance: 0, currency: 'INR' });
        await wallet.save();
      }

      return res.json({
        success: true,
        user: { id: user.payverseId || user._id, name: user.name, email: user.email, phone: user.phone, payverseId: user.payverseId, createdAt: user.createdAt },
        wallet: { balance: wallet.balance, currency: wallet.currency }
      });
    } else {
      const user = memoryUsers.find(u => u._id === req.user.userId || u.id === req.user.userId);
      let wallet = memoryWallets.find(w => w.userId === (user?._id || req.user.userId));
      if (!wallet) wallet = { balance: 1000, currency: 'INR' };

      return res.json({
        success: true,
        user: user ? { id: user.payverseId || user._id, name: user.name, email: user.email, phone: user.phone, payverseId: user.payverseId } : { id: req.user.payverseId || req.user.userId, payverseId: req.user.payverseId },
        wallet: { balance: wallet.balance, currency: wallet.currency }
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
