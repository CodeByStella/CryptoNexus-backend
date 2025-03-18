import Deposit, { IDeposit } from "@/models/depositModel";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";

// Create a new deposit
export const createDeposit = async (
  userId: string,
  amount: number,
  token: string,
  chain: string,
  screenshot: Express.Multer.File | undefined
): Promise<IDeposit> => {
  // Validate inputs
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }
  if (!token || !chain) {
    throw new Error("Token and chain are required");
  }
  if (!screenshot) {
    throw new Error("Screenshot is required");
  }

  // Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), "uploads");
  try {
    if (!fs.existsSync(uploadDir)) {
      console.log("Uploads directory does not exist, creating it...");
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`Created uploads directory at ${uploadDir}`);
    }
  } catch (err: any) {
    throw new Error(`Failed to create uploads directory: ${err.message}`);
  }

  // Define screenshot path
  const screenshotPath = path.join("uploads", `${Date.now()}-${screenshot.originalname}`);
  const fullPath = path.join(process.cwd(), screenshotPath);
  try {
    fs.writeFileSync(fullPath, screenshot.buffer);
  } catch (err: any) {
    throw new Error(`Failed to save screenshot: ${err.message}`);
  }

  // Create the deposit
  const deposit = await Deposit.create({
    user: userId,
    amount,
    token,
    chain,
    screenshot: screenshotPath, // Store relative path
    status: "pending",
  });

  return deposit;
};

// Get deposits for a specific user
export const getUserDeposits = async (userId: string): Promise<IDeposit[]> => {
  return Deposit.find({ user: userId }).sort({ createdAt: -1 });
};

// Get all deposits (for admin)
export const getAllDeposits = async (): Promise<IDeposit[]> => {
  return Deposit.find().populate("user", "email phone").sort({ createdAt: -1 });
};

// Get a single deposit by ID
export const getDepositById = async (depositId: string): Promise<IDeposit | null> => {
  return Deposit.findById(depositId).populate("user", "email phone");
};

// Update deposit status (for admin)
export const updateDepositStatus = async (
  depositId: string,
  status: "approved" | "rejected"
): Promise<IDeposit | null> => {
  const deposit = await Deposit.findById(depositId);
  if (!deposit) {
    throw new Error("Deposit not found");
  }

  deposit.status = status;
  await deposit.save();

  return deposit;
};

