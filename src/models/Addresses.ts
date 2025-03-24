import mongoose from "mongoose";

const DepositAddressSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
    },
    addresses: [
      {
        chain: { type: String, required: true },
        address: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

const DepositAddress = mongoose.model("DepositAddress", DepositAddressSchema);
export default DepositAddress;
