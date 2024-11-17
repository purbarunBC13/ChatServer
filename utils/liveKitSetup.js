import { AccessToken } from "livekit-server-sdk";

export const createToken = (roomName, identity) => {
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity, // Set participant identity
      ttl: 600, // Token validity in seconds (10 minutes)
    }
  );
  at.addGrant({ roomJoin: true, room: roomName });
  return at.toJwt();
};
