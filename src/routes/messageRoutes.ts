import { Router } from "express";
import { body } from "express-validator";
import { sendMessage, getConversation, getUnreadCount, getAllConversations } from "../controllers/messageController";

const router = Router();

// Send a message (if still needed for HTTP-based messaging)
router.post(
  "/messages",
  [
    body("content").notEmpty().withMessage("Content is required"),
    body("senderName").notEmpty().withMessage("Sender name is required"),
    body("senderEmail").isEmail().withMessage("Valid email is required"),
  ],
  sendMessage
);

// Get conversation for a specific user (by email)
router.get("/conversations/:userEmail", getConversation);

// Get unread message count for admin
router.get("/unread-count", getUnreadCount);

// Get all conversations for admin
router.get("/conversations", getAllConversations);

export default router;