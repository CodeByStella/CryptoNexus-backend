import { Request, Response } from "express";
import * as depositService from "../services/depositService";

export const createDeposit = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { amount, token, chain } = req.body;
    const screenshot  = req?.file

    const deposit = await depositService.createDeposit(
      userId,
      parseFloat(amount),
      token,
      chain,
      screenshot 
    );

    res.status(201).json({ message: "Deposit submitted successfully", deposit });
  } catch (error: any) {
    console.error("Error creating deposit:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

export const getUserDeposits = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const deposits = await depositService.getUserDeposits(userId);
    res.status(200).json(deposits);
  } catch (error: any) {
    console.error("Error fetching user deposits:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
