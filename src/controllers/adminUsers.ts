// routes/admin.ts
import { Request, Response } from "express";
import User from "../models/User";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { uid } = req.query; // Support optional UID filter
    let query = {};
    if (uid) {
      query = { uid: { $regex: new RegExp(uid as string, "i") } }; // Case-insensitive search
    }

    const users = await User.find(query);
    res.json(
      users.map((user) => ({
        id: user._id.toString(),
        uid: user.uid, // Added UID
        email: user.email,
        phone: user.phone,
        role: user.role,
        balance: user.balance,
        isVerified: user.isVerified,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUserBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { balance } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.balance = balance; // Expecting array of { currency, amount }
    await user.save();

    res.json({
      id: user._id.toString(),
      uid: user.uid, // Added UID
      email: user.email,
      phone: user.phone,
      role: user.role,
      balance: user.balance,
      isVerified: user.isVerified,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};