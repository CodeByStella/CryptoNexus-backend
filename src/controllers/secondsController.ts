import { Request, Response } from 'express';
import { SecondsRequest } from '@/models/SecondsRequest';
import User from '@/models/User';

export const requestSeconds = async (req: Request, res: Response): Promise<any> => {
  try {
    const { seconds, amount } = req.body;

    if (!seconds || !Number.isInteger(seconds) || seconds <= 0) {
      return res.status(400).json({ message: 'Invalid seconds value' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const secondsRequest = new SecondsRequest({
      user: req.user?.id, // This should be a valid ObjectId
      uid: user.uid,
      seconds,
      amount,
      status: 'pending',
    });

    await secondsRequest.save();
    console.log('Seconds request saved:', secondsRequest);

    res.status(201).json({ requestId: secondsRequest._id, message: 'Seconds request submitted successfully' });
  } catch (error: any) {
    console.error('Error saving seconds request:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const handleTimeout = async (req: Request, res: Response): Promise<any> => {
  try {
    const secondsRequest = await SecondsRequest.findById(req.params.id);
    if (!secondsRequest) {
      return res.status(404).json({ message: 'Seconds request not found' });
    }

    if (secondsRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Seconds request is not pending' });
    }

    secondsRequest.status = 'rejected';
    await secondsRequest.save();

    // Deduct the amount from the user's balance
    const user = await User.findById(secondsRequest.user);
    if (user) {
      const usdtBalance = user.balance.find((b: { currency: string; }) => b.currency === 'USDT');
      if (usdtBalance) {
        usdtBalance.amount -= secondsRequest.amount;
        await user.save();
      }
    }

    res.status(200).json({ message: 'Seconds request timed out and balance deducted' });
  } catch (error: any) {
    console.error('Error handling timeout:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};