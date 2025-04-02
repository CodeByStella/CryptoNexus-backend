import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Trade from '../models/Trade';
import User from '../models/User';
import Transaction from '../models/Transaction';
import mongoose from 'mongoose';

const getProfitPercentage = (seconds: number) => {
  const profitMap: { [key: number]: number; } = {
    30: 12,
    60: 18,
    90: 25,
    180: 32,
    300: 45,
  };
  return profitMap[seconds] || 6; // Default to 6% if seconds not found
};

export const createTrade = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    // Map frontend field names to server field names
    const { tradeType, fromCurrency, toCurrency, amount, expectedPrice, tradeMode, profit } = req.body;

    console.log(req.body,"==============>createTrade")
    const userId = req.user?._id;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!['buy', 'sell'].includes(tradeType)) {
      console.log("Invalid trade type");
      res.status(400).json({ message: 'Invalid trade type. Must be "buy" or "sell".' });
      return;
    }

    if (!['Swap', 'Spot', 'Seconds'].includes(tradeMode)) {
      res.status(400).json({ message: 'Invalid trade mode. Must be "Swap", "Spot", or "Seconds".' });
      return;
    }

    // Prevent "Seconds" trades from being created via this endpoint
    if (tradeMode === 'Seconds') {
      res.status(400).json({ message: 'Seconds trades cannot be created directly. Use the Seconds request workflow.' });
      return;
    }

    // if (user.canWinSeconds) {
    //   const profitPercentage = getProfitPercentage(secondsRequest.seconds);
    //   const pureProfit = secondsRequest.amount * (profitPercentage / 100);
    //   const totalPayout = secondsRequest.amount + pureProfit;

    //   // Update user balance
    //   const user = await User.findById(secondsRequest.user);
    //   if (user) {
    //     const usdtBalance = user.balance.find((b: { currency: string; }) => b.currency === 'USDT');
    //     if (usdtBalance) {
    //       usdtBalance.amount += totalPayout;
    //       await user.save();
    //     }
    //   }
    // }

    const trade = new Trade({
      user: userId,
      tradeType,
      fromCurrency,
      toCurrency,
      principalAmount: amount, // Map 'amount' from frontend to 'principalAmount'
      profitAmount: profit || 0, // Map 'profit' from frontend to 'profitAmount'
      // totalPayout will be calculated by the pre-save hook
      expectedPrice,
      status: 'pending',
      tradeMode,
    });

    const savedTrade = await trade.save();

    res.status(201).json({
      trade: savedTrade.toJSON(),
      message: 'Trade request submitted successfully. Awaiting admin approval.',
    });
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserTrades = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Fetching user trades...");
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const tradeType = req.query.tradeType as string;
    const tradeMode = req.query.tradeMode as string;

    const filter: any = { user: req.user?._id };

    // Apply tradeType filter
    if (tradeType) {
      filter.tradeType = tradeType;
    }

    // Apply tradeMode filter
    if (tradeMode) {
      filter.tradeMode = tradeMode;
    }

    // Apply status filter (if provided, e.g., from frontend)
    if (status) {
      filter.status = status;
    }

    const total = await Trade.countDocuments(filter);
    console.log('Total trades matching filter:', total);

    const trades = await Trade.find(filter)
      .sort({ createdAt: -1 }) // Newest first
      .skip((page - 1) * limit)
      .limit(limit);

    // Log the trades to verify filtering and sorting
    console.log('Fetched trades:', trades.map(t => ({
      id: t._id,
      createdAt: t.createdAt,
      status: t.status,
      tradeMode: t.tradeMode,
      principalAmount: t.principalAmount, // Use new field name in logs
      profitAmount: t.profitAmount, // Use new field name in logs
      totalPayout: t.totalPayout, // Use new field in logs
    })));

    res.json({
      trades,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTrade = async (req: Request, res: Response): Promise<void> => {
  try {
    const trade = await Trade.findById(req.params.id).populate('transactionId');

    if (!trade) {
      res.status(404).json({ message: 'Trade not found' });
      return;
    }

    if (
      trade.user.toString() !== req.user?._id.toString() &&
      req.user?.role !== 'admin'
    ) {
      res.status(403).json({ message: 'Not authorized to access this trade' });
      return;
    }

    res.json(trade);
  } catch (error) {
    console.error('Get trade error:', error);

    // Handle invalid ID error
    if (error instanceof mongoose.Error.CastError) {
      res.status(400).json({ message: 'Invalid trade ID' });
      return;
    }

    res.status(500).json({ message: 'Server error' });
  }
};

export const cancelTrade = async (req: Request, res: Response): Promise<void> => {
  try {
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      res.status(404).json({ message: 'Trade not found' });
      return;
    }

    // Check if trade belongs to user
    if (trade.user.toString() !== req.user?._id.toString()) {
      res.status(403).json({ message: 'Not authorized to cancel this trade' });
      return;
    }

    // Check if trade is in a cancellable state
    if (trade.status !== 'pending') {
      res.status(400).json({
        message: `Cannot cancel trade with status ${trade.status}. Only pending trades can be cancelled.`,
      });
      return;
    }

    trade.status = 'cancelled';
    const updatedTrade = await trade.save();

    res.json({
      trade: updatedTrade,
      message: 'Trade cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel trade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllTrades = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const tradeType = req.query.tradeType as string;
    const tradeMode = req.query.tradeMode as string;
    const userId = req.query.userId as string;

    // Build filter
    const filter: any = {};
    if (status) filter.status = status;
    if (tradeType) filter.tradeType = tradeType;
    if (tradeMode) filter.tradeMode = tradeMode;
    if (userId) filter.user = userId;

    // Count total documents with filter
    const total = await Trade.countDocuments(filter);

    // Get trades with pagination
    const trades = await Trade.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      trades,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('Get all trades error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const processTrade = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    // Map frontend field names to server field names
    const { status, executedPrice, adminNotes, profit } = req.body;
    const trade = await Trade.findById(req.params.id).session(session);

    if (!trade) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ message: 'Trade not found' });
      return;
    }

    if (trade.status !== 'pending' && trade.status !== 'approved') {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        message: `Cannot process trade with status ${trade.status}`,
      });
      return;
    }

    // Get user
    const user = await User.findById(trade.user).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update trade status
    trade.status = status;
    trade.adminNotes = adminNotes || trade.adminNotes;
    trade.approvedBy = req.user?._id;
    trade.approvedAt = new Date();
    if (profit !== undefined) {
      trade.profitAmount = profit; // Map 'profit' from frontend to 'profitAmount'
      // totalPayout will be updated by the pre-save hook
    }

    if (status === 'approved') {
      trade.executedPrice = executedPrice || trade.expectedPrice;
    } else if (status === 'completed') {
      if (!trade.executedPrice && !executedPrice) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({
          message: 'Executed price is required to complete a trade',
        });
        return;
      }

      trade.executedPrice = executedPrice || trade.executedPrice;
      trade.completedAt = new Date();

      // Update user balance based on trade type and create transaction record
      let transaction;

      if (trade.tradeType === 'buy') {
        // Find the balance entry for the purchased currency
        const toBalance = user.balance.find((b: { currency: string; }) => b.currency === trade.toCurrency);
        if (!toBalance) {
          await session.abortTransaction();
          session.endSession();
          res.status(500).json({ message: `User balance missing ${trade.toCurrency}` });
          return;
        }

        // Create transaction for the purchase
        transaction = new Transaction({
          user: user._id,
          type: 'trade',
          amount: trade.principalAmount, // Use 'principalAmount'
          currency: trade.toCurrency,
          status: 'completed',
          description: `Purchase of ${trade.principalAmount} ${trade.toCurrency} at ${trade.executedPrice} ${trade.fromCurrency} each`,
          approvedBy: req.user?._id,
          approvedAt: new Date(),
        });

        // Add the purchased amount to the specific currency's balance
        toBalance.amount += trade.principalAmount; // Use 'principalAmount'
      } else if (trade.tradeType === 'sell') {
        // Find the balance entry for the sold currency
        const fromBalance = user.balance.find((b: { currency: string; }) => b.currency === trade.fromCurrency);
        if (!fromBalance) {
          await session.abortTransaction();
          session.endSession();
          res.status(500).json({ message: `User balance missing ${trade.fromCurrency}` });
          return;
        }

        // Check if user has sufficient balance for the sold currency
        if (fromBalance.amount < trade.principalAmount) { // Use 'principalAmount'
          await session.abortTransaction();
          session.endSession();
          res.status(400).json({ message: `User has insufficient ${trade.fromCurrency} balance` });
          return;
        }

        // Create transaction for the sale
        transaction = new Transaction({
          user: user._id,
          type: 'trade',
          amount: trade.principalAmount, // Use 'principalAmount'
          currency: trade.fromCurrency,
          status: 'completed',
          description: `Sale of ${trade.principalAmount} ${trade.fromCurrency} at ${trade.executedPrice} ${trade.toCurrency} each`,
          approvedBy: req.user?._id,
          approvedAt: new Date(),
        });

        // Deduct the sold amount from the specific currency's balance
        fromBalance.amount -= trade.principalAmount; // Use 'principalAmount'
      }

      // Save transaction and link to trade
      if (transaction) {
        await transaction.save({ session });
        trade.transactionId = transaction._id;
      }

      // Save user with updated balance array
      await user.save({ session });
    }

    const updatedTrade = await trade.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      trade: updatedTrade,
      message: `Trade ${status} successfully`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Process trade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};