import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email?: string;
  phone?: string;
  uid: string;
  password: string;
  role: 'user' | 'admin';
  balance: {
    currency: 'USDT' | 'BTC' | 'USDC' | 'ETH'; 
    amount: number;
  }[];
  walletAddress?: string;
  referralCode: string;
  referredBy?: mongoose.Types.ObjectId;
  isVerified: boolean;
  withdrawalPassword?: string;
  seconds: number;
  canWinSeconds: boolean;
  withdrawalRequests: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  compareWithdrawalPassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      unique: true,
      trim: true,
      sparse: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    uid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    balance: [
      {
        currency: {
          type: String,
          enum: ['USDT', 'BTC', 'USDC', 'ETH'], // Updated enum to only include BTC, USDT, USDC, ETH
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          default: 0,
        },
      },
    ],
    walletAddress: {
      type: String,
      trim: true,
    },
    referralCode: {
      type: String,
      unique: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    withdrawalPassword: {
      type: String,
      select: false,
    },
    seconds: {
      type: Number,
      default: 0,
    },
    canWinSeconds: {
      type: Boolean,
      default: false,
    },
    withdrawalRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Withdrawal',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Middleware to hash password
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Middleware to hash withdrawal password
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('withdrawalPassword') || !this.withdrawalPassword) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.withdrawalPassword = await bcrypt.hash(this.withdrawalPassword, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Middleware to convert empty phone to undefined
UserSchema.pre<IUser>('save', function (next) {
  if (this.phone && this.phone.trim() === '') {
    this.phone = undefined;
  }
  next();
});

// Middleware to generate referralCode if not provided
UserSchema.pre<IUser>('save', function (next) {
  if (!this.referralCode) {
    this.referralCode = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  next();
});

// Middleware to initialize balance array if empty
UserSchema.pre<IUser>('save', function (next) {
  if (!this.balance || this.balance.length === 0) {
    this.balance = [
      { currency: 'USDT', amount: 0 },
      { currency: 'BTC', amount: 0 },
      { currency: 'USDC', amount: 0 },
      { currency: 'ETH', amount: 0 },
    ];
  }
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Compare withdrawal password method
UserSchema.methods.compareWithdrawalPassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.withdrawalPassword) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.withdrawalPassword);
};

// Transform _id to id for API responses
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);