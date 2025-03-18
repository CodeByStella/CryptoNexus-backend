import mongoose, { Schema } from "mongoose";

const ChatSchema = new Schema({
  userEmail: { type: String, required: true, unique: true },
  status: { type: String, enum: ["active", "closed"], default: "active" },
  messages: [{ type: Schema.Types.ObjectId, ref: "Message" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Chat || mongoose.model("Chat", ChatSchema);