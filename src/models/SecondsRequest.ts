import mongoose, { Schema } from 'mongoose';

const secondsRequestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uid: { type: String, required: true },
  seconds: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  timestamp: { type: Date, default: Date.now },
});

export const SecondsRequest = mongoose.model('SecondsRequest', secondsRequestSchema);