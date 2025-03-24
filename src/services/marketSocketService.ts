import { Server, Socket } from 'socket.io';
import axios from 'axios';

const API_ENDPOINTS = {
  crypto: 'https://actisexa.xyz/api/public/ticker',
  forex: 'https://actisexa.xyz/api/public/tickerForex?type=currencys',
  index: 'https://actisexa.xyz/api/public/tickerForex?type=index',
  gold: 'https://actisexa.xyz/api/public/tickerForex?type=gold',
  futures: 'https://actisexa.xyz/api/public/tickerForex?type=futures',
} as const;

type CategoryKey = keyof typeof API_ENDPOINTS;
type MarketData = Record<CategoryKey, any[]>;

let cachedData: MarketData = { crypto: [], forex: [], index: [], gold: [], futures: [] };
let pollingStarted = false; 

const fetchMarketData = async (io: Server) => {
  try {
    const fetchPromises = Object.entries(API_ENDPOINTS).map(async ([key, url]) => {
      const response = await axios.get(url);
      if (response.data.success) {
        cachedData[key as CategoryKey] = response.data.result.map((item: any) => ({
          ...item,
          category: key,
          m: (key === 'gold' || key === 'futures') ? item.scode : item.m,
        }));
      }
    });
    await Promise.all(fetchPromises);
    io.emit('marketData', { success: true, result: cachedData });
  } catch (error) {
    console.error('Error fetching market data:', error);
  }
};

export const setupMarketSocket = (io: Server, socket: Socket): void => {
  socket.emit('marketData', { success: true, result: cachedData });

  if (!pollingStarted) {
    setInterval(() => fetchMarketData(io), 700);
    pollingStarted = true; 
  }
};