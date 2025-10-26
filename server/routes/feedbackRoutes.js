import express from "express";
import { protectEducator } from "../middlewares/authMiddleware.js";
import { getEducatorFeedbacks, toggleFeedbackVisibility } from "../controllers/feedbackController.js";

const feedbackRouter = express.Router();

// Get all feedback for educator's courses
feedbackRouter.get("/educator", getEducatorFeedbacks);

// Toggle feedback visibility (hide/unhide)
feedbackRouter.put("/educator/toggle/:courseId/:userId", toggleFeedbackVisibility);

export default feedbackRouter;
