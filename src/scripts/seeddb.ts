import mongoose from "mongoose";
import DepositAddress from "@/models/Addresses";

const seedDepositAddresses = async () => {
  const MONGODB_URI = process.env.MONGO_URI || "mongodb+srv://testuser:testUser123@free-cluster.xucjn.mongodb.net/actisexa?retryWrites=true&w=majority&appName=free-cluster";
  
  mongoose
    .connect(MONGODB_URI)
    .catch((error) => {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    });

  const addresses = [
    {
      token: "USDT",
      addresses: [
        { chain: "Ethereum", address: "0xEthereumUSDTAddress" },
        { chain: "Binance Smart Chain", address: "0xBSCUSDTAddress" },
        { chain: "Tron", address: "TRXUSDTAddress" },
      ],
    },
    {
      token: "USDC",
      addresses: [
        { chain: "Ethereum", address: "0xEthereumUSDCAddress" },
        { chain: "Binance Smart Chain", address: "0xBSCUSDCAddress" },
        { chain: "Polygon", address: "0xPolygonUSDCAddress" },
      ],
    },
    {
      token: "ETH",
      addresses: [
        { chain: "Ethereum", address: "0xEthereumETHAddress" },
      ],
    },
    {
      token: "BTC",
      addresses: [
        { chain: "Bitcoin", address: "bc1BitcoinBTCAddress" },
      ],
    },
  ];

  await DepositAddress.insertMany(addresses);
  console.log("Deposit addresses seeded successfully.");
  mongoose.connection.close();
};

seedDepositAddresses();
