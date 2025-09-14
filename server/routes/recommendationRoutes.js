import express from "express";
import { getRecommendations } from "../controllers/recommendationController.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

router.get("/user", requireAuth(), getRecommendations);

export default router;
