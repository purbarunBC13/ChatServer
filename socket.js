import { Server as SocketIOServer } from "socket.io";
import Message from "./models/MessegesModel.js";
import Channel from "./models/ChannelModel.js";

const setupSocket = (server) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const userSocketMap = new Map();

  const disconnect = (socket) => {
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        console.log(`userId ${userId} disconnected`);
        break;
      }
    }
  };

  const sendMessage = async (message) => {
    const senderSocketId = userSocketMap.get(message.sender);
    const recipientSocketId = userSocketMap.get(message.recipient);
    const createdMessage = await Message.create(message);

    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id firstName lastName email image color")
      .populate("recipient", "id firstName lastName email image color");

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receiveMessage", messageData);
    }
    if (senderSocketId) {
      io.to(senderSocketId).emit("receiveMessage", messageData);
    }
  };

  const sendChannelMessage = async (message) => {
    const { channelId, sender, content, messageType, fileUrl } = message;
    const createdMessage = await Message.create({
      sender,
      recipient: null,
      content,
      messageType,
      timestamp: new Date(),
      fileUrl,
    });

    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id firstName lastName email image color")
      .exec();

    await Channel.findByIdAndUpdate(channelId, {
      $push: { messages: messageData._id },
    });

    const channel = await Channel.findById(channelId).populate("members");

    const finalData = {
      ...messageData._doc,
      channelId: channel._id,
      channelName: channel.name,
    };

    if (channel && channel.members) {
      channel.members.forEach((member) => {
        const memberSocketId = userSocketMap.get(member._id.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("recieve-channel-message", finalData);
        }
      });

      const adminSocketId = userSocketMap.get(channel.admin._id.toString());

      if (adminSocketId) {
        io.to(adminSocketId).emit("recieve-channel-message", finalData);
      }
    }
  };

  const sendCallRequest = async ({ room, userIdentity }) => {
    const recipientSocketId = userSocketMap.get(room);
    console.log(`Sending call request to ${room}`);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receiveCallRequest", {
        room,
        userIdentity,
      });
    }
  };

  const sendChannelCallRequest = async ({
    channelId,
    userIdentity,
    userId,
  }) => {
    const channel = await Channel.findById(channelId).populate("members admin");
    const filteredMembers = channel.members.filter(
      (member) => member._id.toString() !== userId
    );
    if (channel && filteredMembers) {
      filteredMembers.forEach((member) => {
        const memberSocketId = userSocketMap.get(member._id.toString());
        console.log(`Sending call request to ${member._id}`);
        if (memberSocketId) {
          io.to(memberSocketId).emit("receiveChannelCallRequest", {
            channelId,
            userIdentity,
          });
        }
      });

      if (channel.admin._id.toString() !== userId) {
        const adminSocketId = userSocketMap.get(channel.admin._id.toString());
        console.log(`Sending call request to ${channel.admin._id}`);
        if (adminSocketId) {
          io.to(adminSocketId).emit("receiveChannelCallRequest", {
            channelId,
            userIdentity,
          });
        }
      }
    }
  };

  const sendTyping = async (recipientId, senderId) => {
    const recipientSocketId = userSocketMap.get(recipientId);
    // const senderSocketId = userSocketMap.get(senderId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("typing", { recipientId, senderId });
      console.log(`User is typing to recipient: ${recipientId}`);
    }
  };

  const stopTyping = async (recipientId, senderId) => {
    const recipientSocketId = userSocketMap.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("stop typing", { recipientId, senderId });
      console.log(`User stopped typing to recipient: ${recipientId}`);
    }
  };

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`userId ${userId} connected with socketId ${socket.id}`);
    } else {
      console.log("userId not found");
    }

    socket.on("sendMessage", sendMessage);
    socket.on("send-channel-message", sendChannelMessage);
    socket.on("sendCallRequest", sendCallRequest);
    socket.on("sendChannelCallRequest", sendChannelCallRequest);
    socket.on("typing", ({ recipientId, senderId }) => {
      sendTyping(recipientId, senderId);
    });

    socket.on("stop typing", ({ recipientId, senderId }) => {
      stopTyping(recipientId, senderId);
    });

    socket.on("disconnect", () => disconnect(socket));
  });
};

export default setupSocket;
