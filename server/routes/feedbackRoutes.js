import express from "express";
import { protectEducator } from "../middlewares/authMiddleware.js";
import {
  getEducatorFeedbacks,
  toggleFeedbackVisibility,
  getCourseFeedbacks,
  deleteFeedback,
} from "../controllers/feedbackController.js";

const feedbackRouter = express.Router();

// 🧑‍🏫 Educator Routes
feedbackRouter.get("/educator", protectEducator, getEducatorFeedbacks);
feedbackRouter.put("/educator/toggle/:feedbackId", protectEducator, toggleFeedbackVisibility);
feedbackRouter.delete("/educator/:feedbackId", protectEducator, deleteFeedback);

// 🧑‍🎓 Public/Student Route
feedbackRouter.get("/course/:courseId", getCourseFeedbacks);

export default feedbackRouter;
