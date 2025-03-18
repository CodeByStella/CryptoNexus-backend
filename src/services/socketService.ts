import { Server, Socket } from "socket.io";
import Message from "../models/Message";
import Chat from "../models/Chat";

export const setupSocketIO = (io: Server): void => {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("fetchMessages", async (email: string) => {
      try {
        if (!email) {
          socket.emit("messagesFetched", []);
          return;
        }
        const decodedEmail = decodeURIComponent(email);
        const chat = await Chat.findOne({ userEmail: decodedEmail }).populate("messages");
        const messages = chat ? chat.messages : [];
        const formattedMessages = messages.map((msg: any) => ({
          sender: msg.isAdminMessage ? "admin" : "user",
          content: msg.content,
          avatar: msg.isAdminMessage ? "⚫" : "👤",
          isAdminMessage: msg.isAdminMessage,
          senderName: msg.senderName,
        }));
        socket.emit("messagesFetched", formattedMessages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        socket.emit("fetchError", { message: "Failed to retrieve messages" });
      }
    });

    socket.on("joinChat", async (email: string) => {
      try {
        if (!email) return;
        const decodedEmail = decodeURIComponent(email);
        socket.data.userEmail = decodedEmail;
        socket.join(decodedEmail);

        let chat = await Chat.findOne({ userEmail: decodedEmail });
        if (!chat) {
          chat = new Chat({ userEmail: decodedEmail });
          const adminMessage = new Message({
            senderName: "Admin",
            senderEmail: "system@admin.com",
            recipientEmail: decodedEmail,
            content: "Hello. How may I help you?",
            isRead: true,
            isAdminMessage: true,
          });
          await adminMessage.save();
          chat.messages.push(adminMessage._id);
          await chat.save();
          io.to(decodedEmail).emit("adminMessage", {
            sender: "admin",
            content: "Hello. How may I help you?",
            avatar: "⚫",
            isAdminMessage: true,
            senderName: "Admin",
          });
        }
        io.to("admins").emit("newUser", { email: decodedEmail });
      } catch (error) {
        console.error("Join chat error:", error);
      }
    });

    socket.on("sendMessage", async (data: { name: string; email: string; content: string }) => {
      try {
        const { name, email, content } = data;
        const decodedEmail = decodeURIComponent(email);
        const chat = await Chat.findOne({ userEmail: decodedEmail });
        if (!chat) return;

        const newMessage = new Message({
          senderName: name,
          senderEmail: decodedEmail,
          content,
          isRead: false,
          isAdminMessage: false,
        });
        await newMessage.save();
        chat.messages.push(newMessage._id);
        await chat.save();

        const messageData = {
          sender: "user",
          senderName: name,
          senderEmail: decodedEmail,
          content,
          isAdminMessage: false,
        };
        io.to("admins").emit("userMessage", messageData);
        socket.emit("messageSent", { sender: "user", content });
      } catch (error) {
        console.error("Socket message error:", error);
        socket.emit("messageError", { message: "Failed to send message" });
      }
    });

    socket.on("adminJoin", (adminEmail: string) => {
      socket.join("admins");
      socket.data.adminEmail = adminEmail;
      console.log(`Admin joined: ${socket.id} with email: ${adminEmail}`);
    });

    socket.on("adminSendMessage", async (data: { email: string; content: string }) => {
      try {
        const { email, content } = data;
        const decodedEmail = decodeURIComponent(email);
        const adminEmail = socket.data.adminEmail;
        if (!adminEmail) {
          socket.emit("adminMessageError", { message: "Admin not authenticated" });
          return;
        }

        const chat = await Chat.findOne({ userEmail: decodedEmail });
        if (!chat) return;

        const adminMessage = new Message({
          senderName: "Admin",
          senderEmail: adminEmail,
          recipientEmail: decodedEmail,
          content,
          isRead: true,
          isAdminMessage: true,
        });
        await adminMessage.save();
        chat.messages.push(adminMessage._id);
        await chat.save();

        const messageData = {
          sender: "admin",
          content,
          avatar: "⚫",
          isAdminMessage: true,
          senderName: "Admin",
        };
        io.to(decodedEmail).emit("adminMessage", messageData); // Send to user only
        socket.emit("adminMessageSent", { recipient: decodedEmail, content });
      } catch (error) {
        console.error("Admin message error:", error);
        socket.emit("adminMessageError", { message: "Failed to send admin message" });
      }
    });

    socket.on("closeChat", async (email: string) => {
      const decodedEmail = decodeURIComponent(email);
      const chat = await Chat.findOne({ userEmail: decodedEmail });
      if (chat) {
        chat.status = "closed";
        await chat.save();
      }
      io.to(decodedEmail).emit("chatClosed", { email: decodedEmail });
      io.to("admins").emit("chatClosed", { email: decodedEmail });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};