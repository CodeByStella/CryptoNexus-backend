import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Trade from '../models/Trade';
import User from '../models/User';
import Transaction from '../models/Transaction';
import mongoose from 'mongoose';

export const createTrade = async (req: Request, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tradeType, fromCurrency, toCurrency, amount, expectedPrice } = req.body;
    const userId = req.user?._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!['buy', 'sell'].includes(tradeType)) {
      console.log("dkofjsd")
      return res.status(400).json({ message: 'Invalid trade type. Must be "buy" or "sell".' });
    }

    const trade = new Trade({
      user: userId,
      tradeType,
      fromCurrency,
      toCurrency,
      amount,
      expectedPrice,
      status: 'pending',
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

export const getUserTrades = async (req: Request, res: Response): Promise<any> => {
  try {
    console.log("in the file")
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const tradeType = req.query.tradeType as string;

    const filter: any = { user: req.user?._id };
    if (status) filter.status = status;
    if (tradeType) filter.tradeType = tradeType;

    const total = await Trade.countDocuments(filter);

    const trades = await Trade.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      trades,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTrade = async (req: Request, res: Response): Promise<any> => {
  try {
    const trade = await Trade.findById(req.params.id)
      .populate('transactionId');

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    if (
      trade.user.toString() !== req.user?._id.toString() &&
      req.user?.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to access this trade' });
    }

    res.json(trade);
  } catch (error) {
    console.error('Get trade error:', error);
    
    // Handle invalid ID error
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid trade ID' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

export const cancelTrade = async (req: Request, res: Response) => {
  try {
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    // Check if trade belongs to user
    if (trade.user.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this trade' });
    }

    // Check if trade is in a cancellable state
    if (trade.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot cancel trade with status ${trade.status}. Only pending trades can be cancelled.` 
      });
    }

    trade.status = 'cancelled';
    const updatedTrade = await trade.save();

    res.json({
      trade: updatedTrade,
      message: 'Trade cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel trade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllTrades = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const tradeType = req.query.tradeType as string;
    const userId = req.query.userId as string;

    // Build filter
    const filter: any = {};
    if (status) filter.status = status;
    if (tradeType) filter.tradeType = tradeType;
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
      total
    });
  } catch (error) {
    console.error('Get all trades error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const processTrade = async (req: Request, res: Response): Promise<any> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, executedPrice, adminNotes } = req.body;
    const trade = await Trade.findById(req.params.id).session(session);

    if (!trade) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Trade not found' });
    }

    if (trade.status !== 'pending' && trade.status !== 'approved') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: `Cannot process trade with status ${trade.status}` 
      });
    }

    // Get user
    const user = await User.findById(trade.user).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    // Update trade status
    trade.status = status;
    trade.adminNotes = adminNotes || trade.adminNotes;
    trade.approvedBy = req.user?._id;
    trade.approvedAt = new Date();

    if (status === 'approved') {
      trade.executedPrice = executedPrice || trade.expectedPrice;
    } else if (status === 'completed') {
      if (!trade.executedPrice && !executedPrice) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          message: 'Executed price is required to complete a trade' 
        });
      }
      
      trade.executedPrice = executedPrice || trade.executedPrice;
      trade.completedAt = new Date();

      // Update user balance based on trade type and create transaction record
      let transaction;
      
      if (trade.tradeType === 'buy') {
        // Find the balance entry for the purchased currency
        const toBalance = user.balance.find(b => b.currency === trade.toCurrency);
        if (!toBalance) {
          await session.abortTransaction();
          session.endSession();
          return res.status(500).json({ message: `User balance missing ${trade.toCurrency}` });
        }

        // Create transaction for the purchase
        transaction = new Transaction({
          user: user._id,
          type: 'trade',
          amount: trade.amount,
          currency: trade.toCurrency,
          status: 'completed',
          description: `Purchase of ${trade.amount} ${trade.toCurrency} at ${trade.executedPrice} ${trade.fromCurrency} each`,
          approvedBy: req.user?._id,
          approvedAt: new Date()
        });

        // Add the purchased amount to the specific currency's balance
        toBalance.amount += trade.amount;
      } else if (trade.tradeType === 'sell') {
        // Find the balance entry for the sold currency
        const fromBalance = user.balance.find(b => b.currency === trade.fromCurrency);
        if (!fromBalance) {
          await session.abortTransaction();
          session.endSession();
          return res.status(500).json({ message: `User balance missing ${trade.fromCurrency}` });
        }

        // Check if user has sufficient balance for the sold currency
        if (fromBalance.amount < trade.amount) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ message: `User has insufficient ${trade.fromCurrency} balance` });
        }

        // Create transaction for the sale
        transaction = new Transaction({
          user: user._id,
          type: 'trade',
          amount: trade.amount,
          currency: trade.fromCurrency,
          status: 'completed',
          description: `Sale of ${trade.amount} ${trade.fromCurrency} at ${trade.executedPrice} ${trade.toCurrency} each`,
          approvedBy: req.user?._id,
          approvedAt: new Date()
        });

        // Deduct the sold amount from the specific currency's balance
        fromBalance.amount -= trade.amount;
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
      message: `Trade ${status} successfully`
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Process trade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};