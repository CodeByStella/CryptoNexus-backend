import { Router } from "express";
import Message from "../models/Message";

const router = Router();

// GET /admin/tickets - Fetch unique users who have started chats
router.get("/tickets", async (req, res) => {
  try {
    // Get distinct senderEmail values from the Message collection (excluding admin messages)
    const uniqueUsers = await Message.distinct("senderEmail", { isAdminMessage: false });

    // For each unique email, fetch the latest message to get the senderName and createdAt
    const tickets = await Promise.all(
      uniqueUsers.map(async (email: string) => {
        const latestMessage = await Message.findOne({ senderEmail: email, isAdminMessage: false })
          .sort({ createdAt: -1 })
          .select("senderName senderEmail createdAt");

        return {
          id: email, // Use email as the unique identifier for the "ticket"
          userName: latestMessage?.senderName || "Unknown User",
          userEmail: email,
          createdAt: latestMessage?.createdAt || new Date(),
        };
      })
    );

    // Sort tickets by the latest message's createdAt (newest first)
    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json(tickets);
  } catch (error: any) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;