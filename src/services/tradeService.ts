import mongoose from 'mongoose';
import Trade, { ITrade } from '../models/Trade';

// Define a type for the input tradeData that includes the frontend field names
interface TradeInput {
  user?: mongoose.Types.ObjectId;
  tradeType?: 'buy' | 'sell';
  fromCurrency?: string;
  toCurrency?: string;
  amount?: number; // Frontend sends 'amount'
  profit?: number; // Frontend sends 'profit'
  expectedPrice?: number;
  tradeMode?: 'Swap' | 'Spot' | 'Seconds';
  status?: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'timedout';
  [key: string]: any; // Allow other fields to be passed
}

class TradeService {
  // Create a new trade
  async createTrade(tradeData: TradeInput) {
    const { user, tradeType, fromCurrency, toCurrency, amount, expectedPrice, profit } = tradeData;
    if (!user || !tradeType || !fromCurrency || !toCurrency || !amount || !expectedPrice) {
      throw new Error('Missing required fields: user, tradeType, fromCurrency, toCurrency, amount, expectedPrice');
    }

    // Map frontend field names to the new model field names
    const mappedTradeData: Partial<ITrade> = {
      ...tradeData,
      principalAmount: amount, // Map 'amount' to 'principalAmount'
      profitAmount: profit || 0, // Map 'profit' to 'profitAmount', default to 0 if not provided
      // totalPayout will be calculated by the model's pre-save hook
    };

    const trade = new Trade(mappedTradeData);
    return await trade.save();
  }

  // Fetch all trades
  async getTrades() {
    return await Trade.find().lean();
  }

  // Update a trade's status
  async updateTradeStatus(
    tradeId: string,
    status: 'approved' | 'rejected',
    adminNotes?: string,
    approvedBy?: mongoose.Types.ObjectId
  ) {
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      throw new Error('Trade not found');
    }
    if (!['approved', 'rejected'].includes(status)) {
      throw new Error('Invalid status');
    }
    trade.status = status;
    if (status === 'approved') {
      trade.approvedBy = approvedBy;
      trade.approvedAt = new Date();
    }
    trade.adminNotes = adminNotes;
    trade.updatedAt = new Date();
    return await trade.save();
  }
}

export default new TradeService();