import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

import { getAiResponse } from "../controllers/AiController.js";

const aiRoutes = Router();

aiRoutes.post("/response", verifyToken, getAiResponse);

export default aiRoutes;
