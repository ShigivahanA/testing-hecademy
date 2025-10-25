// routes/quizRoutes.js
import express from "express";
import {
  createQuiz,
  getCourseQuizzes,
  deleteQuiz,
  submitQuiz,
} from "../controllers/quizController.js";
import { protectEducator} from "../middlewares/authMiddleware.js";

const quizRouter = express.Router();

quizRouter.post("/create", protectEducator, createQuiz);
quizRouter.get("/all", protectEducator, getAllQuizzes);
quizRouter.get("/:courseId", protectEducator, getCourseQuizzes);
quizRouter.delete("/:quizId", protectEducator, deleteQuiz);

// Student
quizRouter.post("/submit", submitQuiz);
quizRouter.get("/student/:courseId", getCourseQuizzes);

export default quizRouter;
