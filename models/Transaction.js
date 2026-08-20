import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sender: {
    type: String
  },
  senderName: {
    type: String,
    default: 'Self / Top-up'
  },
  recipient: {
    type: String
  },
  recipientName: {
    type: String,
    default: 'PayVerse Wallet'
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'transfer', 'topup', 'add_money'],
    required: true
  },
  status: {
    type: String,
    default: 'completed'
  },
  title: {
    type: String,
    default: 'Transaction'
  },
  description: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export default Transaction;
