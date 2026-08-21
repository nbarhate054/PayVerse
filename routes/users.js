import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { memoryUsers } from './auth.js';

const router = express.Router();

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
