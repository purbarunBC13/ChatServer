import { createToken } from "../utils/liveKitSetup.js";

export const createChatToken = async (req, res) => {
  const { room, identity } = req.query;

  // Validate query parameters
  if (!room || !identity) {
    return res.status(400).json({ error: "Room and identity are required." });
  }
  try {
    const token = await createToken(room, identity); // Generate token
    if (!token) {
      return res.status(500).json({ error: "Failed to generate token." });
    }
    return res.status(200).json(token); // Send the token as a response
  } catch (error) {
    console.error("Error generating token:", error);
    return res.status(500).json({ error: "Failed to generate token." });
  }
};
