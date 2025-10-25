// routes/quizRoutes.js
import express from "express";
import {
  createQuiz,
  getCourseQuizzes,
  deleteQuiz,
  submitQuiz,
  getAllQuizzes,
  updateQuiz,
} from "../controllers/quizController.js";
import { protectEducator } from "../middlewares/authMiddleware.js";

const quizRouter = express.Router();

// Educator
quizRouter.post("/create", protectEducator, createQuiz);
quizRouter.get("/all", protectEducator, getAllQuizzes);
quizRouter.put("/:quizId", protectEducator, updateQuiz);
quizRouter.delete("/:quizId", protectEducator, deleteQuiz);
quizRouter.get("/:courseId", protectEducator, getCourseQuizzes);

// Student
quizRouter.post("/submit", submitQuiz);
quizRouter.get("/student/:courseId", getCourseQuizzes);

export default quizRouter;
