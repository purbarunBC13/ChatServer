import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  console.log(req.cookies);
  const token = req.cookies.jwt;
  console.log(req.cookies.jwt);
  if (!token) {
    return res.status(401).send("You are unauthorized");
  }
  jwt.verify(token, process.env.JWT_KEY, async (err, payload) => {
    if (err) {
      return res.status(401).send("Token is not valid");
    }
    // console.log(payload);
    req.userId = payload.userId;
    next();
  });
};
