import { Request, Response } from 'express';
import { SecondsRequest } from '@/models/SecondsRequest';
import User from '@/models/User';
import Trade from '@/models/Trade'; // Import Trade model

// Helper function to calculate profit percentage based on seconds
const getProfitPercentage = (seconds: number) => {
  const profitMap: { [key: number]: number } = {
    30: 12,
    60: 18,
    90: 25,
    180: 32,
    300: 45,
  };
  return profitMap[seconds] || 6; // Default to 6% if seconds not found
};

export const getPendingSecondsRequests = async (req: Request, res: Response) => {
  try {
    console.log("Fetching pending seconds requests...");

    const requests = await SecondsRequest.find({ status: "pending" })
      .populate<{ user: { uid: string } }>("user", "uid")
      .lean();

    if (!requests.length) {
      console.log("No pending requests found.");
    }

    const formattedRequests = requests.map(r => ({
      id: r._id,
      uid: r.user?.uid ?? "Unknown",
      seconds: r.seconds,
      amount: r.amount,
      status: r.status,
      timestamp: r.createdAt, // Add timestamp for frontend display
    }));

    res.status(200).json(formattedRequests);
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
      return res.status(400).json({
        message: `Request already ${secondsRequest.status}`,
        status: secondsRequest.status
      });
    }

    // Calculate pure profit (without principal)
    const profitPercentage = getProfitPercentage(secondsRequest.seconds);
    const pureProfit = secondsRequest.amount * (profitPercentage / 100);
    const totalPayout = secondsRequest.amount + pureProfit;

    // Update user balance
    const user = await User.findById(secondsRequest.user);
    if (user) {
      const usdtBalance = user.balance.find((b: { currency: string; }) => b.currency === 'USDT');
      if (usdtBalance) {
        usdtBalance.amount += totalPayout;
        await user.save();
      }
    }

    // Update request status
    secondsRequest.status = 'approved';
    secondsRequest.approvedAt = new Date();
    await secondsRequest.save();

    // Create trade with clear profit separation
    const trade = new Trade({
      user: secondsRequest.user,
      tradeType: secondsRequest.tradeType,
      fromCurrency: secondsRequest.fromCurrency,
      toCurrency: secondsRequest.toCurrency,
      principalAmount: secondsRequest.amount,
      profitAmount: pureProfit,
      expectedPrice: secondsRequest.openPrice,
      tradeMode: 'Seconds',
      status: 'completed',
      approvedBy: req.user?.id,
      approvedAt: new Date()
    });
    await trade.save();

    // Return response with clear profit separation
    res.status(200).json({
      success: true,
      principalAmount: secondsRequest.amount,  // Original amount (3000)
      profit: pureProfit,                     // Just the profit (180)
      payout: totalPayout,                    // Optional total (3180)
      message: 'Trade successfully approved'
    });

  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

export const rejectSecondsRequest = async (req: Request, res: Response): Promise<any> => {
  try {
    const secondsRequest = await SecondsRequest.findById(req.params.id);
    if (!secondsRequest) {
      return res.status(404).json({ message: 'Seconds request not found' });
    }

    if (secondsRequest.status !== 'pending') {
      return res.status(400).json({
        message: `Seconds request is already ${secondsRequest.status}, cannot reject`,
        status: secondsRequest.status,
      });
    }

    secondsRequest.status = 'rejected';
    await secondsRequest.save();
    console.log('Seconds request status updated to rejected:', secondsRequest);

    // No balance deduction here since amount was not deducted initially

    res.status(200).json({
      message: 'Seconds request rejected successfully',
      requestId: secondsRequest._id,
      status: 'rejected',
    });
  } catch (error: any) {
    console.error('Error rejecting seconds request:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const toggleCanWinSeconds = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId, canWinSeconds } = req.body;

    if (!userId || typeof canWinSeconds !== 'boolean') {
      return res.status(400).json({ message: 'User ID and canWinSeconds (boolean) are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.canWinSeconds = canWinSeconds;
    await user.save();
    console.log(`Updated canWinSeconds for user ${userId} to ${canWinSeconds}`);

    res.status(200).json({
      message: `User's canWinSeconds updated to ${canWinSeconds}`,
      userId,
      canWinSeconds: user.canWinSeconds,
    });
  } catch (error: any) {
    console.error('Error toggling canWinSeconds:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};