import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Withdrawal from '../models/Withdrawal';

// Define the shape of a seconds request for the getPendingSeconds response
interface SecondsRequestResponse {
  id: string;
  uid: string;
  seconds: number;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Date;
}

// User: Request a withdrawal
export const requestWithdrawal = async (req: Request, res: Response): Promise<any> => {
  try {
    const { amount, address, password } = req.body;

    // Find the user (middleware guarantees req.user.id exists)
    const user = await User.findById(req.user?.id).select('+withdrawalPassword');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Validate withdrawal password
    if (!user.withdrawalPassword) {
      res.status(400).json({ message: 'Please set a withdrawal password first' });
      return;
    }
    const isPasswordValid = await user.compareWithdrawalPassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid withdrawal password' });
      return;
    }

    // Validate amount
    if (amount < 10) {
      res.status(400).json({ message: 'Amount must be at least 10 USDT' });
      return;
    }

    // Check balance
    const usdtBalance = user.balance.find((b: { currency: string; }) => b.currency === 'USDT')?.amount || 0;
    if (amount > usdtBalance) {
      res.status(400).json({ message: 'Insufficient balance' });
      return;
    }

    // Create withdrawal request
    const withdrawal = new Withdrawal({
      user: req.user?.id,
      uid: user.uid,
      amount,
      token: 'USDT', // Hardcoded to USDT for now
      address,
      status: 'pending',
    });

    await withdrawal.save();

    // Add withdrawal request to user's withdrawalRequests
    user.withdrawalRequests.push(withdrawal._id);
    await user.save();

    res.status(201).json({ message: 'Withdrawal request submitted successfully', withdrawal });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// User: Set withdrawal password
export const setWithdrawalPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters long' });
      return;
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.withdrawalPassword = password; // Will be hashed by the pre-save middleware
    await user.save();

    res.status(200).json({ message: 'Withdrawal password set successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Admin: Get all pending withdrawals
export const getPendingWithdrawals = async (req: Request, res: Response): Promise<any> => {
  try {
    const withdrawals = await Withdrawal.find({ status: 'pending' }).populate('user', 'uid');
    res.status(200).json(withdrawals);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Admin: Approve a withdrawal
export const approveWithdrawal = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      res.status(404).json({ message: 'Withdrawal not found' });
      return;
    }

    if (withdrawal.status !== 'pending') {
      res.status(400).json({ message: 'Withdrawal is not pending' });
      return;
    }

    const user = await User.findById(withdrawal.user);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Deduct the amount from the user's balance
    const usdtBalance = user.balance.find((b: { currency: string; }) => b.currency === 'USDT');
    if (!usdtBalance || usdtBalance.amount < withdrawal.amount) {
      res.status(400).json({ message: 'Insufficient balance' });
      return;
    }

    usdtBalance.amount -= withdrawal.amount;
    withdrawal.status = 'approved';

    await Promise.all([user.save(), withdrawal.save()]);

    res.status(200).json({ message: 'Withdrawal approved successfully', withdrawal });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Admin: Reject a withdrawal
export const rejectWithdrawal = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      res.status(404).json({ message: 'Withdrawal not found' });
      return;
    }

    if (withdrawal.status !== 'pending') {
      res.status(400).json({ message: 'Withdrawal is not pending' });
      return;
    }

    withdrawal.status = 'rejected';
    await withdrawal.save();

    res.status(200).json({ message: 'Withdrawal rejected successfully', withdrawal });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Admin: Get all pending seconds requests
export const getPendingSeconds = async (req: Request, res: Response): Promise<any> => {
  try {
    const users = await User.find({ 'secondsRequests.status': 'pending' })
      .select('uid seconds secondsRequests')
      .lean();

    const formattedRequests = users
      .flatMap((user: any): SecondsRequestResponse[] =>
        (user.secondsRequests || [])
          .filter((req: any) => req.status === 'pending')
          .map((req: any): SecondsRequestResponse => ({
            id: req._id.toString(),
            uid: user.uid,
            seconds: req.seconds,
            status: req.status,
            timestamp: req.createdAt,
          }))
      )
      .filter((req: SecondsRequestResponse | undefined): req is SecondsRequestResponse => !!req);

    res.status(200).json(formattedRequests);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Admin: Approve a seconds request
export const approveSeconds = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ 'secondsRequests._id': id });
    if (!user) {
      res.status(404).json({ message: 'Seconds request not found' });
      return;
    }

    const request = user.secondsRequests?.find((req: { _id: { toString: () => string; }; }) => req._id.toString() === id);
    if (!request || request.status !== 'pending') {
      res.status(400).json({ message: 'Seconds request is not pending' });
      return;
    }

    request.status = 'approved';
    user.seconds = (user.seconds || 0) + request.seconds;

    await user.save();

    res.status(200).json({ message: 'Seconds request approved successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Admin: Reject a seconds request
export const rejectSeconds = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ 'secondsRequests._id': id });
    if (!user) {
      res.status(404).json({ message: 'Seconds request not found' });
      return;
    }

    const request = user.secondsRequests?.find((req: { _id: { toString: () => string; }; }) => req._id.toString() === id);
    if (!request || request.status !== 'pending') {
      res.status(400).json({ message: 'Seconds request is not pending' });
      return;
    }

    request.status = 'rejected';
    await user.save();

    res.status(200).json({ message: 'Seconds request rejected successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};