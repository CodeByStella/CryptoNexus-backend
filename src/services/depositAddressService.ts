import DepositAddress from "@/models/Addresses";
import Deposit, { IDeposit } from "@/models/depositModel";

class DepositAddressService {
  async getAllDeposits(): Promise<any> {
    try {
      const deposits = await Deposit.find({})
        .populate("user", "email phone")
        .sort({ createdAt: -1 })
        .lean();
  
      const formattedDeposits = deposits.map((deposit) => ({
        ...deposit,
        id: deposit._id?.toString(),
        user: deposit.user 
          ? { email: (deposit.user as any).email, phone: (deposit.user as any).phone }
          : { email: "Unknown", phone: "Unknown" },
        screenshot: deposit.screenshot
          ? `/${deposit.screenshot}`
          : null,
      }));
  
      return formattedDeposits;
    } catch (error) {
      console.error("Error fetching all deposits:", error);
      throw new Error("Failed to fetch deposits");
    }
  }

  async getAllAddresses() {
    return await DepositAddress.find({});
  }

  async getAddressesByToken(token: string) {
    return await DepositAddress.findOne({ token });
  }

  async updateAddress(token: string, chain: string, newAddress: string) {
    const updatedToken = await DepositAddress.findOneAndUpdate(
      { token, "addresses.chain": chain },
      { $set: { "addresses.$.address": newAddress } },
      { new: true }
    );

    if (!updatedToken) {
      return await DepositAddress.findOneAndUpdate(
        { token },
        { $push: { addresses: { chain, address: newAddress } } },
        { new: true, upsert: true }
      );
    }

    return updatedToken;
  }

  async updateDepositStatus(depositId: string, status: "accepted" | "rejected") {
    try {
      const updatedDeposit = await Deposit.findByIdAndUpdate(
        depositId,
        { status },
        { new: true }
      );
      if (!updatedDeposit) {
        throw new Error("Deposit not found");
      }
      return updatedDeposit;
    } catch (error) {
      console.error("Error updating deposit status:", error);
      throw new Error("Failed to update deposit status");
    }
  }
}

export default new DepositAddressService();