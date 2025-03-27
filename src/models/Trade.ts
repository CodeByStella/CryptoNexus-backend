import mongoose, { Document, Schema } from 'mongoose';

export interface ITrade extends Document {
  user: mongoose.Types.ObjectId;
  tradeType: 'buy' | 'sell';
  fromCurrency: string;
  toCurrency: string;
  principalAmount: number;
  profitAmount: number;
  totalPayout: number;
  expectedPrice: number;
  executedPrice?: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'timedout';
  transactionId?: mongoose.Types.ObjectId;
  adminNotes?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  tradeMode: 'Swap' | 'Spot' | 'Seconds';
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
    principalAmount: {
      type: Number,
      required: true,
    },
    profitAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalPayout: {
      type: Number,
      required: true,
      default: 0, // Add default value to avoid validation errors
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
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled', 'timedout'],
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
    tradeMode: {
      type: String,
      enum: ['Swap', 'Spot', 'Seconds'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add pre-save hook to calculate totalPayout
TradeSchema.pre<ITrade>('save', function (next) {
  // Always calculate totalPayout to ensure it’s set, even if principalAmount or profitAmount isn’t modified
  if (typeof this.principalAmount !== 'number' || typeof this.profitAmount !== 'number') {
    return next(new Error('principalAmount and profitAmount must be numbers'));
  }
  this.totalPayout = this.principalAmount + this.profitAmount;
  next();
});

TradeSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.user = ret.user?.toString();
    ret.transactionId = ret.transactionId?.toString();
    ret.approvedBy = ret.approvedBy?.toString();
    ret.createdAt = ret.createdAt.toISOString();
    ret.updatedAt = ret.updatedAt.toISOString();
    ret.approvedAt = ret.approvedAt?.toISOString();
    ret.completedAt = ret.completedAt?.toISOString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model<ITrade>('Trade', TradeSchema);