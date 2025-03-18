import mongoose, { Document, Schema } from "mongoose";

export interface IMessage extends Document {
  senderName: string; // User's name (from the form)
  senderEmail: string; // User's email (used as the chat room identifier)
  adminEmail?: string; // Optional email for the admin (e.g., support@company.com)
  isAdminMessage: boolean; // Indicates if the message is from an admin
  content: string; // Message content
  isRead: boolean; // Whether the message has been read
  createdAt: Date; // Automatically managed by timestamps
  updatedAt: Date; // Automatically managed by timestamps
}

const MessageSchema: Schema = new Schema(
  {
    senderName: {
      type: String,
      required: true,
    },
    senderEmail: {
      type: String,
      required: true,
    },
    adminEmail: {
      type: String, // Optional, for admin messages
    },
    isAdminMessage: {
      type: Boolean,
      default: false,
    },
    content: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Add an index on senderEmail for efficient querying
MessageSchema.index({ senderEmail: 1 });

export default mongoose.model<IMessage>("Message", MessageSchema);