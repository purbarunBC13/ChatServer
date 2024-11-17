import Router from "express";
import { createChatToken } from "../controllers/CallController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

const callRoutes = Router();

callRoutes.get("/token", verifyToken, createChatToken);

export default callRoutes;
