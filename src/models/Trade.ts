import mongoose, { Document, Schema } from 'mongoose';

export interface ITrade extends Document {
  user: mongoose.Types.ObjectId;
  tradeType: 'buy' | 'sell';
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  expectedPrice: number;
  executedPrice?: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  transactionId?: mongoose.Types.ObjectId;
  adminNotes?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TradeSchema: Schema = new Schema<ITrade>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tradeType: {
      type: String,
      enum: ['buy', 'sell'],
      required: true,
    },
    fromCurrency: {
      type: String,
      required: true,
    },
    toCurrency: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    expectedPrice: {
      type: Number,
      required: true,
    },
    executedPrice: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    adminNotes: {
      type: String,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

TradeSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model<ITrade>('Trade', TradeSchema);