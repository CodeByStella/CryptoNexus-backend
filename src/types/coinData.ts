export interface CoinData {
    id: string;
    symbol: string;
    name: string;
    price: number;
    marketCap: number;
    volume24h: number;
    percentChange24h: number;
    percentChange7d: number;
    lastUpdated: string;
  }
  
  export interface CoinDetailedData extends CoinData {
    description?: string;
    image?: string;
    marketCapRank?: number;
    fullyDilutedValuation?: number;
    totalVolume?: number;
    high24h?: number;
    low24h?: number;
    priceChangePercentage30d?: number;
    circulatingSupply?: number;
    totalSupply?: number;
    maxSupply?: number;
  }