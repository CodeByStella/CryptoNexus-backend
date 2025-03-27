import mongoose, { Schema } from 'mongoose';

const secondsRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seconds: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  tradeType: { type: String, enum: ['buy', 'sell'], required: true },
  fromCurrency: { type: String, required: true },
  toCurrency: { type: String, required: true },
  openPrice: { type: Number, required: true },
});

export const SecondsRequest = mongoose.model('SecondsRequest', secondsRequestSchema);