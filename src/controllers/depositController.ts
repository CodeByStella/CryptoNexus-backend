import { Request, Response } from "express";
import DepositAddressService from "@/services/depositAddressService";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "@/models/User"; // Assuming User model import

interface DepositAddress {
  token: string;
  chain: string;
  address: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: Date;
}

class DepositAddressController {
  // Existing methods (unchanged)
  async getAll(req: Request, res: Response) {
    try {
      const addresses = await DepositAddressService.getAllAddresses();
      res.json(addresses);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }

  async getByToken(req: Request, res: Response): Promise<any> {
    try {
      const { token } = req.params;
      const addressData = await DepositAddressService.getAddressesByToken(token);

      if (!addressData) {
        return res.status(404).json({ message: "Token not found" });
      }

      res.json(addressData);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }

  async update(req: Request, res: Response): Promise<any> {
    try {
      const { token, chain, address } = req.body;

      if (!token || !chain || !address) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const updatedAddress = await DepositAddressService.updateAddress(token, chain, address);
      res.json(updatedAddress);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }

  // Admin-specific methods
  async getAllDeposits(req: Request, res: Response): Promise<any> {
    try {
      const deposits = await DepositAddressService.getAllDeposits();
      console.log(deposits);
      res.json(deposits);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
      }
      res.status(500).json({ message: "Server error", error });
    }
  }

  async updateDepositStatus(req: Request, res: Response): Promise<any> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id, status } = req.body;

      if (!id || !["accepted", "rejected"].includes(status)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "Invalid request data" });
      }

      // Update deposit status
      const updatedDeposit = await DepositAddressService.updateDepositStatus(id, status);
      if (!updatedDeposit) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "Deposit not found" });
      }

      // If deposit is accepted, update user's balance
      if (status === "accepted") {
        const user = await User.findById(updatedDeposit.user).session(session);
        if (!user) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ message: "User not found" });
        }

        // Find the balance entry for the deposited token
        const tokenBalance = user.balance.find(b => b.currency === updatedDeposit.token);
        if (!tokenBalance) {
          await session.abortTransaction();
          session.endSession();
          return res.status(500).json({ message: `User balance missing ${updatedDeposit.token}` });
        }

        // Add the deposited amount to the user's balance
        tokenBalance.amount += updatedDeposit.amount;

        // Save the updated user
        await user.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      res.json(updatedDeposit);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Update deposit status error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  }
}

export default new DepositAddressController();