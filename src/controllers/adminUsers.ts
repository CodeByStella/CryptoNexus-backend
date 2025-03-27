import { Request, Response } from "express";
import User from "../models/User";

// Middleware to ensure the user is an admin
const ensureAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }
  next();
};

// Get all users (with optional UID filter)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { uid } = req.query;
    let query = {};
    if (uid) {
      query = { uid: { $regex: new RegExp(uid as string, "i") } };
    }

    const users = await User.find(query);
    res.json(
      users.map((user) => ({
        id: user._id.toString(),
        uid: user.uid,
        email: user.email,
        phone: user.phone,
        role: user.role,
        balance: user.balance,
        isVerified: user.isVerified,
        canWinSeconds: user.canWinSeconds || false, // Include canWinSeconds in the response
      }))
    );
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update a user's balance
export const updateUserBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { balance } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.balance = balance;
    await user.save();

    res.json({
      id: user._id.toString(),
      uid: user.uid,
      email: user.email,
      phone: user.phone,
      role: user.role,
      balance: user.balance,
      isVerified: user.isVerified,
      canWinSeconds: user.canWinSeconds || false, // Include canWinSeconds in the response
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update a user's canWinSeconds status
export const updateCanWinSeconds = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params; // Changed from userId to id to match your existing convention
    const { canWinSeconds } = req.body;

    // Validate input
    if (typeof canWinSeconds !== "boolean") {
      return res.status(400).json({ message: "canWinSeconds must be a boolean value." });
    }

    // Find the user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update canWinSeconds
    user.canWinSeconds = canWinSeconds;
    await user.save();

    res.json({
      id: user._id.toString(),
      uid: user.uid,
      email: user.email,
      phone: user.phone,
      role: user.role,
      balance: user.balance,
      isVerified: user.isVerified,
      canWinSeconds: user.canWinSeconds,
    });
  } catch (error: any) {
    console.error("Error updating canWinSeconds:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
