import axios from 'axios';
import { CoinData } from '../types/coinData';

const COINMARKETCAP_API_URL = 'https://pro-api.coinmarketcap.com/v1';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

export const getCoinMarketCapData = async (limit: number = 100): Promise<CoinData[]> => {
  try {
    const response = await axios.get(`${COINMARKETCAP_API_URL}/cryptocurrency/listings/latest`, {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY
      },
      params: {
        limit,
        convert: 'USD'
      }
    });

    return response.data.data.map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      price: coin.quote.USD.price,
      marketCap: coin.quote.USD.market_cap,
      volume24h: coin.quote.USD.volume_24h,
      percentChange24h: coin.quote.USD.percent_change_24h,
      percentChange7d: coin.quote.USD.percent_change_7d,
      lastUpdated: coin.last_updated
    }));
  } catch (error) {
    console.error('CoinMarketCap API error:', error);
    throw new Error('Failed to fetch cryptocurrency data from CoinMarketCap');
  }
};

export const getCoinGeckoData = async (limit: number = 100): Promise<CoinData[]> => {
  try {
    const response = await axios.get(`${COINGECKO_API_URL}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: limit,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h,7d'
      }
    });

    return response.data.map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      marketCap: coin.market_cap,
      volume24h: coin.total_volume,
      percentChange24h: coin.price_change_percentage_24h,
      percentChange7d: coin.price_change_percentage_7d_in_currency,
      lastUpdated: coin.last_updated
    }));
  } catch (error) {
    console.error('CoinGecko API error:', error);
    throw new Error('Failed to fetch cryptocurrency data from CoinGecko');
  }
};

export const getMarketData = async (limit: number = 100): Promise<CoinData[]> => {
  try {
    if (process.env.COINMARKETCAP_API_KEY) {
      return await getCoinMarketCapData(limit);
    }
    return await getCoinGeckoData(limit);
  } catch (error) {
    console.error('Market data API error:', error);
    throw new Error('Failed to fetch cryptocurrency market data');
  }
};

export const getCoinDetails = async (coinId: string): Promise<any> => {
  try {
    const response = await axios.get(`${COINGECKO_API_URL}/coins/${coinId}`, {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false
      }
    });

    return {
      id: response.data.id,
      symbol: response.data.symbol.toUpperCase(),
      name: response.data.name,
      description: response.data.description.en,
      image: response.data.image.large,
      marketCap: response.data.market_data.market_cap.usd,
      marketCapRank: response.data.market_data.market_cap_rank,
      fullyDilutedValuation: response.data.market_data.fully_diluted_valuation?.usd,
      totalVolume: response.data.market_data.total_volume.usd,
      high24h: response.data.market_data.high_24h.usd,
      low24h: response.data.market_data.low_24h.usd,
      priceChange24h: response.data.market_data.price_change_24h,
      priceChangePercentage24h: response.data.market_data.price_change_percentage_24h,
      priceChangePercentage7d: response.data.market_data.price_change_percentage_7d,
      priceChangePercentage30d: response.data.market_data.price_change_percentage_30d,
      circulatingSupply: response.data.market_data.circulating_supply,
      totalSupply: response.data.market_data.total_supply,
      maxSupply: response.data.market_data.max_supply,
      lastUpdated: response.data.last_updated
    };
  } catch (error) {
    console.error('Coin details API error:', error);
    throw new Error(`Failed to fetch details for coin: ${coinId}`);
  }
};