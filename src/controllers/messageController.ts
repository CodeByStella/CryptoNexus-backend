import { Request, Response } from "express";
import Message from "../models/Message";

// Send a message (for users via HTTP, if still needed)
export const sendMessage = async (req: Request, res: Response): Promise<any> => {
  try {
    const { content, senderName, senderEmail } = req.body;

    // Create new message
    const message = new Message({
      senderName,
      senderEmail,
      content,
      isAdminMessage: false,
      isRead: false,
    });

    await message.save();

    res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get conversation between a user (by email) and admin
export const getConversation = async (req: Request, res: Response) => {
  try {
    const { userEmail } = req.params; // The user's email (e.g., john@example.com)

    // Fetch messages where senderEmail matches userEmail
    const messages = await Message.find({
      senderEmail: userEmail,
    })
      .sort({ createdAt: 1 })
      .lean();

    // Mark messages as read for the admin
    await Message.updateMany(
      {
        senderEmail: userEmail,
        isAdminMessage: false,
        isRead: false,
      },
      { isRead: true }
    );

    res.json(messages);
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get unread message count for admin
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    // Count all unread messages sent to admin (isAdminMessage: false, isRead: false)
    const count = await Message.countDocuments({
      isAdminMessage: false,
      isRead: false,
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all conversations for admin
export const getAllConversations = async (req: Request, res: Response) => {
  try {
    // Group messages by senderEmail to identify unique conversations
    const conversations = await Message.aggregate([
      {
        $sort: { createdAt: -1 }, // Sort by most recent messages first
      },
      {
        $group: {
          _id: "$senderEmail", // Group by senderEmail (unique user chats)
          lastMessage: { $first: "$$ROOT" }, // Get the most recent message
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$isAdminMessage", false] }, { $eq: ["$isRead", false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          userEmail: "$_id",
          userName: "$lastMessage.senderName",
          lastMessage: {
            content: "$lastMessage.content",
            createdAt: "$lastMessage.createdAt",
            isAdminMessage: "$lastMessage.isAdminMessage",
          },
          unreadCount: 1,
        },
      },
      {
        $sort: { "lastMessage.createdAt": -1 }, // Sort by last message date
      },
    ]);

    res.json(conversations);
  } catch (error) {
    console.error("Get all conversations error:", error);
    res.status(500).json({ message: "Server error" });
  }
};