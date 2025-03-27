import { Request, Response } from 'express';
import { SecondsRequest } from '@/models/SecondsRequest';
import User from '@/models/User';
import Trade from '@/models/Trade';

// Helper function for profit percentage
const getProfitPercentage = (seconds: number): number => {
  const profitMap: { [key: number]: number; } = {
    30: 6,
    60: 9,
    90: 13,
    120: 16,
    180: 21,
    300: 28,
  };
  return profitMap[seconds] || 6;
};

export const requestSeconds = async (req: Request, res: Response): Promise<any> => {
  try {
    // Extract all required fields from the request body
    const { seconds, amount, tradeType, fromCurrency, toCurrency, openPrice } = req.body;

    // Validation
    if (!seconds || !Number.isInteger(seconds) || seconds <= 0) {
      return res.status(400).json({ message: 'Invalid seconds value' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    if (!tradeType || !['buy', 'sell'].includes(tradeType)) {
      return res.status(400).json({ message: 'Invalid trade type. Must be "buy" or "sell".' });
    }
    if (!fromCurrency || typeof fromCurrency !== 'string' || fromCurrency.trim() === '') {
      return res.status(400).json({ message: 'Invalid fromCurrency. Must be a non-empty string.' });
    }
    if (!toCurrency || typeof toCurrency !== 'string' || toCurrency.trim() === '') {
      return res.status(400).json({ message: 'Invalid toCurrency. Must be a non-empty string.' });
    }
    if (typeof openPrice !== 'number' || openPrice <= 0) {
      return res.status(400).json({ message: 'Invalid openPrice. Must be a positive number.' });
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check balance
    const usdtBalance = user.balance.find((b: { currency: string; }) => b.currency === 'USDT');
    if (!usdtBalance || usdtBalance.amount < amount) {
      return res.status(400).json({ message: 'Insufficient USDT balance' });
    }

    // Create seconds request with all required fields
    const secondsRequest = new SecondsRequest({
      user: req.user?.id,
      uid: user.uid,
      seconds,
      amount,
      tradeType,
      fromCurrency,
      toCurrency,
      openPrice,
      status: user.canWinSeconds ? 'approved' : 'pending',
      approvedAt: user.canWinSeconds ? new Date() : null,
    });

    await secondsRequest.save();
    console.log('Seconds request saved:', secondsRequest);

    // Handle canWinSeconds case
    if (user.canWinSeconds) {
      const profitPercentage = getProfitPercentage(seconds);
      const profit = amount * (profitPercentage / 100);
      usdtBalance.amount += profit;
      await user.save();

      // Create a Trade record for the auto-approved Seconds trade
      const trade = new Trade({
        user: req.user?.id,
        tradeType,
        fromCurrency,
        toCurrency,
        amount,
        expectedPrice: openPrice,
        principalAmount: amount,
        tradeMode: 'Seconds',
        profit,
        status: 'completed',
        createdAt: new Date(),
      });
      await trade.save();
      console.log('Trade created for auto-approved Seconds request:', trade);

      return res.status(201).json({
        requestId: secondsRequest._id,
        message: 'Seconds request auto-approved due to canWinSeconds',
        status: 'approved',
        profit,
        totalAmount: amount + profit,
      });
    }

    res.status(201).json({
      requestId: secondsRequest._id,
      message: 'Seconds request submitted successfully',
      status: 'pending',
    });
  } catch (error: any) {
    console.error('Error saving seconds request:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const handleTimeout = async (req: Request, res: Response): Promise<any> => {
  try {
    const request = await SecondsRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Trade not found' });

    // If the trade was already approved (e.g., by an admin)
    if (request.status === 'approved') {
      // Find the corresponding Trade to get profit details
      const trade = await Trade.findOne({
        user: request.user,
        tradeMode: 'Seconds',
        createdAt: { $gte: request.createdAt },
      }).sort({ createdAt: -1 }).lean();

      if (!trade) {
        // Fallback: Calculate profit if Trade record is missing
        const profitPercentage = getProfitPercentage(request.seconds);
        const pureProfit = request.amount * (profitPercentage / 100);
        const totalPayout = request.amount + pureProfit;

        return res.status(200).json({
          status: 'completed',
          principalAmount: request.amount,
          profit: pureProfit,
          payout: totalPayout,
          message: 'Trade was already approved (calculated profit)',
        });
      }

      // Use Trade data
      const profit = trade.profitAmount || 0;
      const totalPayout = trade.principalAmount + profit;

      return res.status(200).json({
        status: 'completed',
        principalAmount: trade.principalAmount,
        profit: profit,
        payout: totalPayout,
        message: 'Trade was already approved',
      });
    }

    // Mark as rejected if not already approved
    request.status = 'rejected';
    await request.save();

    // Deduct balance
    let balanceDeducted = false;
    const user = await User.findById(request.user);
    if (user) {
      const usdtBalance = user.balance.find((b: { currency: string; }) => b.currency === 'USDT');
      if (usdtBalance && usdtBalance.amount >= request.amount) {
        usdtBalance.amount -= request.amount;
        balanceDeducted = true;
        await user.save();
      }
    }

    // Calculate loss (profit is negative)
    const profit = -request.amount; // Full loss
    const totalPayout = 0; // No payout for a loss

    // Record trade with loss
    await new Trade({
      user: request.user,
      tradeType: request.tradeType,
      fromCurrency: request.fromCurrency,
      toCurrency: request.toCurrency,
      principalAmount: request.amount,
      profitAmount: profit, // Full loss
      expectedPrice: request.openPrice,
      tradeMode: 'Seconds',
      status: 'rejected',
      createdAt: new Date(),
    }).save();

    // Return structured response
    res.status(200).json({
      status: 'rejected',
      principalAmount: request.amount,
      profit: profit, // Negative value for loss
      payout: totalPayout, // 0 for a loss
      balanceDeducted,
      message: 'Trade timed out and rejected',
    });
  } catch (error) {
    console.error('Timeout error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Timeout processing failed',
      status: 'error',
    });
  }
};
export const getSecondsRequest = async (req: Request, res: Response): Promise<any> => {
  try {
    const secondsRequest = await SecondsRequest.findById(req.params.id).lean();
    if (!secondsRequest) {
      return res.status(404).json({ message: 'Seconds request not found' });
    }

    // Find the corresponding trade
    const trade = await Trade.findOne({
      user: secondsRequest.user,
      tradeMode: 'Seconds',
      createdAt: { $gte: secondsRequest.createdAt }
    }).sort({ createdAt: -1 }).lean();

    let profit = 0;
    let totalAmount = secondsRequest.amount;

    if (secondsRequest.status === 'approved') {
      if (trade) {
        profit = trade.profitAmount || 0;
        totalAmount = trade.totalPayout || secondsRequest.amount;
      } else {
        // Calculate expected profit if no trade record exists
        const profitPercentage = getProfitPercentage(secondsRequest.seconds);
        profit = secondsRequest.amount * (profitPercentage / 100);
        totalAmount = secondsRequest.amount + profit;
      }
    }

    res.status(200).json({
      requestId: secondsRequest._id,
      status: secondsRequest.status,
      amount: secondsRequest.amount,
      seconds: secondsRequest.seconds,
      profit,
      totalAmount,
      // ... other fields
    });
  } catch (error: any) {
    console.error('Error fetching seconds request:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};