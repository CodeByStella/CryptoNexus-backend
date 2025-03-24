import { Request, Response } from 'express';
import { SecondsRequest } from '@/models/SecondsRequest';
import User from '@/models/User';

export const getPendingSecondsRequests = async (req: Request, res: Response) => {
  try {
    console.log("Fetching pending seconds requests...");

    const requests = await SecondsRequest.find({ status: "pending" })
      .populate<{ user: { uid: string } }>("user", "uid") // Explicitly type the populated user field
      .lean();

    if (!requests.length) {
      console.log("No pending requests found.");
    }

    const formattedRequests = requests.map(r => ({
      id: r._id,
      uid: r.user?.uid ?? "Unknown", // Use nullish coalescing for safety
      seconds: r.seconds,
      amount: r.amount,
      status: r.status,
      timestamp: r.timestamp,
    }));

    res.status(200).json(formattedRequests); // Fix: Remove the string quotes around formattedRequests
  } catch (error: any) {
    console.error("Error fetching seconds requests:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const approveSecondsRequest = async (req: Request, res: Response): Promise<any> => {
  try {
    const secondsRequest = await SecondsRequest.findById(req.params.id);
    if (!secondsRequest) {
      return res.status(404).json({ message: 'Seconds request not found' });
    }

    if (secondsRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Seconds request is not pending' });
    }

    secondsRequest.status = 'approved';
    await secondsRequest.save();

    // Credit the user with the profit
    const user = await User.findById(secondsRequest.user);
    if (user) {
      const profitPercentage = getProfitPercentage(secondsRequest.seconds); // Calculate profit based on seconds
      const profit = secondsRequest.amount * (profitPercentage / 100);
      const usdtBalance = user.balance.find((b: { currency: string; }) => b.currency === 'USDT');
      if (usdtBalance) {
        usdtBalance.amount += secondsRequest.amount + profit; // Return the amount + profit
      } else {
        user.balance.push({ currency: 'USDT', amount: secondsRequest.amount + profit });
      }
      await user.save();
    }

    res.status(200).json({ message: 'Seconds request approved successfully' });
  } catch (error: any) {
    console.error('Error approving seconds request:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const rejectSecondsRequest = async (req: Request, res: Response): Promise<any> => {
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

    res.status(200).json({ message: 'Seconds request rejected successfully' });
  } catch (error: any) {
    console.error('Error rejecting seconds request:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};


// Helper function to calculate profit percentage based on seconds
const getProfitPercentage = (seconds: number) => {
  const profitMap: { [key: number]: number } = {
    30: 6,
    60: 9,
    90: 13,
    120: 16,
    180: 21,
    300: 28,
  };
  return profitMap[seconds] || 6; // Default to 6% if seconds not found
};