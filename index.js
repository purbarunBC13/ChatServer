import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cron from "node-cron";

import authRoutes from "./routes/AuthRoutes.js";
import contactsRoutes from "./routes/ContactRoutes.js";
import messagesRoutes from "./routes/MessagesRoutes.js";
import channelRoutes from "./routes/ChannelRoutes.js";
import callRoutes from "./routes/CallRoutes.js";
import aiRoutes from "./routes/AI.route.js";

import setupSocket, { getUserSocketMap, getIO } from "./socket.js"; // updated to export getUserSocket
import { Event } from "./models/EventModel.js"; // create this model

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const databaseURL = process.env.DATABASE_URL;

// Middleware
app.use(
  cors({
    origin: [process.env.ORIGIN],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);
app.use("/uploads/profiles", express.static("uploads/profiles"));
app.use("/uploads/files", express.static("uploads/files"));

app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use(callRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/channel", channelRoutes);
app.use("/api/ai", aiRoutes);

// Server + Socket
const server = app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});

setupSocket(server); // if socket.js returns io
const io = getIO(); // Get the Socket.IO instance
// Database
mongoose
  .connect(databaseURL)
  .then(() => {
    console.log("Connected to the database");
  })
  .catch((error) => {
    console.log("Error:", error.message);
  });

// ✅ Smart Scheduler Cron Job (every minute)
cron.schedule("* * * * *", async () => {
  const now = new Date();
  const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);

  const upcomingEvents = await Event.find({
    dateTime: { $gte: now, $lte: tenMinutesLater },
  });
  upcomingEvents.forEach((event) => {
    const socketId = getUserSocketMap(event.userId.toString()); // or however you're mapping users
    const receipentSocketId = getUserSocketMap(event.recipientId.toString());
    console.log(socketId, "socketId for user", event.userId.toString());
    if (io && socketId) {
      io.to(socketId).emit("reminder", {
        message: `⏰ You have an upcoming event: ${event.description}`,
        time: event.dateTime,
      });
      io.to(receipentSocketId).emit("reminder", {
        message: `⏰ You have an upcoming event: ${event.description}`,
        time: event.dateTime,
      });
    } else if (!io) {
      console.error("Socket.io instance is undefined.");
    }
  });
});
