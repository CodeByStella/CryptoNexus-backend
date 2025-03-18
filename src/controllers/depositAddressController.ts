// src/controllers/depositAddressController.ts
import { Request, Response } from "express";
import DepositAddress from "@/models/Addresses";

export const getDepositAddresses = async (req: Request, res: Response): Promise<void> => {
  try {
    const addresses = await DepositAddress.find().sort({ token: 1 });
    res.status(200).json(addresses);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch deposit addresses" });
  }
};

export const updateDepositAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log("Received request to update deposit address");
      console.log("Request params:", req.params);
      console.log("Request body:", req.body);
  
      const { id } = req.params;
      const { addresses } = req.body;
  
      if (!id) {
        console.error("Error: No ID provided");
        res.status(400).json({ message: "ID is required" });
        return;
      }
  
      if (!addresses || !Array.isArray(addresses)) {
        console.error("Error: Invalid addresses data", addresses);
        res.status(400).json({ message: "Invalid addresses data" });
        return;
      }
  
      console.log(`Updating deposit address with ID: ${id}`);
  
      const updated = await DepositAddress.findByIdAndUpdate(
        id,
        { addresses },
        { new: true, runValidators: true }
      );
  
      if (!updated) {
        console.error("Deposit address not found for ID:", id);
        res.status(404).json({ message: "Deposit address not found" });
        return;
      }
  
      console.log("Successfully updated deposit address:", updated);
      res.status(200).json(updated);
    } catch (error: any) {
      console.error("Error updating deposit address:", error);
      res.status(500).json({ message: "Failed to update deposit address", error: error.message });
    }
  };
  

export const createDepositAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, addresses } = req.body;
    const newAddress = new DepositAddress({ token, addresses });
    await newAddress.save();
    res.status(201).json(newAddress);
  } catch (error) {
    res.status(500).json({ message: "Failed to create deposit address" });
  }
};