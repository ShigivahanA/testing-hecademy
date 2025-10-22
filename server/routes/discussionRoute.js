import express from "express";
import { getDiscussions, addMessage, getAllCourseQuestions } from "../controllers/discussionController.js";

const discussionRouter = express.Router();

discussionRouter.get("/:courseId", getDiscussions);
discussionRouter.post("/add", addMessage);
discussionRouter.get("/educator/all", getAllCourseQuestions);

export default discussionRouter;
