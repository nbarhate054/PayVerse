import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { memoryUsers } from './auth.js';

const router = express.Router();

// Handler for fetching all registered contacts from MongoDB Atlas excluding current user
const handleGetContacts = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const currentUserId = req.user?._id || req.user?.userId || req.user?.id;
    const currentUserPayverseId = req.user?.payverseId;
    const currentUserPhone = req.user?.phone ? req.user.phone.replace(/\D/g, '').slice(-10) : '';
    const searchQuery = (req.query.search || req.query.query || '').toString().trim();

    if (mongoose.connection.readyState === 1) {
      // Build conditions to strictly exclude the current logged-in user
      const excludeConditions = [];
      if (currentUserId) {
        if (mongoose.isValidObjectId(currentUserId)) {
          excludeConditions.push({ _id: currentUserId });
        }
        excludeConditions.push({ payverseId: currentUserId });
      }
      if (currentUserPayverseId) {
        excludeConditions.push({ payverseId: currentUserPayverseId });
      }
      if (currentUserPhone) {
        excludeConditions.push({ phone: currentUserPhone });
        excludeConditions.push({ phone: `+91${currentUserPhone}` });
      }

      const filter = excludeConditions.length > 0 ? { $nor: excludeConditions } : {};

      if (searchQuery) {
        const esc = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const digits = searchQuery.replace(/\D/g, '');
        const conditions = [
          { name: new RegExp(esc, 'i') },
          { payverseId: new RegExp(esc, 'i') },
          { phone: new RegExp(esc, 'i') },
          { email: new RegExp(esc, 'i') },
        ];
        if (digits && digits.length >= 4) {
          conditions.push({ phone: new RegExp(digits) });
        }
        filter.$and = [{ $or: conditions }];
      }

      const users = await User.find(filter)
        .select('name phone payverseId email createdAt userType')
        .sort({ name: 1 })
        .lean();

      return res.status(200).json({
        success: true,
        users: users.map(u => ({
          id: u.payverseId || u._id.toString(),
          _id: u._id.toString(),
          name: u.name,
          email: u.email,
          phone: u.phone ? u.phone.replace(/\D/g, '').slice(-10) : '',
          payverseId: u.payverseId,
          createdAt: u.createdAt,
          userType: u.userType || 'adult',
        }))
      });
    } else {
      // Memory Store Fallback
      let list = memoryUsers.filter(u => {
        const uId = (u._id || u.id || '').toString();
        const uPayverse = (u.payverseId || '').toString().toLowerCase();
        const uPhone = (u.phone || '').toString().replace(/\D/g, '').slice(-10);

        if (currentUserId && (uId === currentUserId.toString() || uPayverse === currentUserId.toString().toLowerCase())) {
          return false;
        }
        if (currentUserPayverseId && uPayverse === currentUserPayverseId.toLowerCase()) {
          return false;
        }
        if (currentUserPhone && uPhone === currentUserPhone) {
          return false;
        }

        if (!searchQuery) return true;
        const sLower = searchQuery.toLowerCase();
        const uName = (u.name || '').toLowerCase();
        const uEmail = (u.email || '').toLowerCase();
        return (
          uName.includes(sLower) ||
          uPayverse.includes(sLower) ||
          (u.phone || '').includes(searchQuery) ||
          uEmail.includes(sLower)
        );
      });

      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      return res.status(200).json({
        success: true,
        users: list.map(u => ({
          id: u.payverseId || (u._id || u.id || '').toString(),
          _id: (u._id || u.id || '').toString(),
          name: u.name,
          email: u.email,
          phone: u.phone ? u.phone.replace(/\D/g, '').slice(-10) : '',
          payverseId: u.payverseId || `${u.name.toLowerCase().replace(/\s+/g, '')}@payverse`,
          createdAt: u.createdAt,
          userType: u.userType || 'adult',
        }))
      });
    }
  } catch (error) {
    console.error('Get Users Error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, message: error.message || 'Error fetching users' });
  }
};

// GET /api/users/all-contacts and GET /api/users
router.get('/all-contacts', authMiddleware, handleGetContacts);
router.get('/', authMiddleware, handleGetContacts);

const handleFindUser = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { query } = req.query || {};

    if (!query || !query.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query parameter is required.'
      });
    }

    const cleanQuery = query.toString().trim();
    const digitsOnly = cleanQuery.replace(/\D/g, '');
    const cleanLower = cleanQuery.toLowerCase();

    if (mongoose.connection.readyState === 1) {
      const escapedRec = cleanLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const conditions = [
        { payverseId: cleanLower },
        { payverseId: cleanLower.endsWith('@payverse') ? cleanLower : `${cleanLower}@payverse` },
        { payverseId: new RegExp('^' + escapedRec, 'i') },
        { phone: cleanQuery },
        { phone: cleanQuery.startsWith('+91') ? cleanQuery : `+91${cleanQuery}` },
        { phone: cleanQuery.replace(/^\+91/, '').trim() },
        { email: cleanLower },
        { name: new RegExp('^' + escapedRec, 'i') }
      ];

      if (digitsOnly && digitsOnly.length >= 10) {
        const tenDigits = digitsOnly.slice(-10);
        conditions.push({ phone: new RegExp(tenDigits + '$') });
      }

      if (mongoose.isValidObjectId(cleanQuery)) {
        conditions.push({ _id: cleanQuery });
      }

      let user = await User.findOne({ $or: conditions }).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No PayVerse account found with this query. Please check the details.'
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          phone: user.phone,
          payverseId: user.payverseId,
          email: user.email
        }
      });
    } else {
      // Memory Fallback
      let user = memoryUsers.find(u => {
        const uPhone = (u.phone || '').toString();
        const uPayverse = (u.payverseId || '').toLowerCase();
        const uEmail = (u.email || '').toLowerCase();
        const uId = (u._id || u.id || '').toString();

        if (uPayverse === cleanLower || uPayverse === (cleanLower.endsWith('@payverse') ? cleanLower : `${cleanLower}@payverse`)) return true;
        if (uPhone === cleanQuery || uPhone === cleanQuery.replace(/^\+91/, '').trim()) return true;
        if (digitsOnly && digitsOnly.length >= 10 && uPhone.replace(/\D/g, '').endsWith(digitsOnly.slice(-10))) return true;
        if (uEmail === cleanLower) return true;
        if (uId === cleanQuery) return true;
        return false;
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No PayVerse account found with this query. Please check the details.'
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          _id: user._id || user.id,
          name: user.name,
          phone: user.phone,
          payverseId: user.payverseId || `${user.name.toLowerCase().replace(/\s+/g, '')}@payverse`,
          email: user.email
        }
      });
    }
  } catch (error) {
    console.error('Find User Error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      message: error.message || 'Error looking up user'
    });
  }
};

// GET /api/users/find and GET /api/users/find-user
router.get('/find', authMiddleware, handleFindUser);
router.get('/find-user', authMiddleware, handleFindUser);

export default router;
