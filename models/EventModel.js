import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  description: String,
  dateTime: Date,
  createdAt: { type: Date, default: Date.now },
});

export const Event = mongoose.model("Event", eventSchema);
