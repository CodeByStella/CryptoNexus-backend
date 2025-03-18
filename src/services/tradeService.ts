import mongoose from 'mongoose';
import Trade, { ITrade } from '../models/Trade';

class TradeService {
  // Create a new trade
  async createTrade(tradeData: Partial<ITrade>) {
    const { user, tradeType, fromCurrency, toCurrency, amount, expectedPrice } = tradeData;
    if (!user || !tradeType || !fromCurrency || !toCurrency || !amount || !expectedPrice) {
      throw new Error('Missing required fields: user, tradeType, fromCurrency, toCurrency, amount, expectedPrice');
    }
    const trade = new Trade(tradeData);
    return await trade.save();
  }

  // Fetch all trades
  async getTrades() {
    return await Trade.find().lean();
  }

  // Update a trade's status
  async updateTradeStatus(tradeId: string, status: 'approved' | 'rejected', adminNotes?: string, approvedBy?: mongoose.Types.ObjectId) {
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