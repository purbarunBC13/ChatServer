import Message from "../models/MessegesModel.js";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export const getMessages = async (req, res, next) => {
  try {
    const user1 = req.userId;
    const user2 = req.body.id;
    if (!user1 || !user2) {
      return res.status(400).send("Both users are required");
    }
    const messages = await Message.find({
      $or: [
        {
          sender: user1,
          recipient: user2,
        },
        {
          sender: user2,
          recipient: user1,
        },
      ],
    }).sort({ timestamp: 1 });
    // console.log(messages);
    return res.status(200).send(messages);
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    // Upload file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto", // Allows uploading any file type (e.g., images, videos, PDFs)
      folder: "uploads/files", // Organize files in Cloudinary
    });

    // Send the URL and public_id of the uploaded file back to the frontend
    return res
      .status(200)
      .send({ filePath: result.secure_url, public_id: result.public_id });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal Server Error");
  }
};
