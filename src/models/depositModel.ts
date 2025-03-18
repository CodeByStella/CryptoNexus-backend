import mongoose, { Document, Schema } from "mongoose";

export interface IDeposit extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  token: string;
  chain: string;
  screenshot: string; // Path to the uploaded screenshot
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const DepositSchema: Schema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    chain: {
      type: String,
      required: true,
    },
    screenshot: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Transform _id to id for API responses
DepositSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model<IDeposit>("Deposit", DepositSchema);