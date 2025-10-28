import express from "express";
import { getRecommendations } from "../controllers/recommendationController.js";

const recommendationRouter = express.Router();

recommendationRouter.post("/user", getRecommendations);

export default recommendationRouter;
