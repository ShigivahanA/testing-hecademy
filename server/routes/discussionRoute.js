import express from "express";
import {
  getDiscussions,
  startDiscussion,
  replyToThread,
  updateDiscussionStatus,
  getAllCourseQuestions,
} from "../controllers/discussionController.js";
import { protectEducator } from "../middlewares/authMiddleware.js";


const discussionRouter = express.Router();

// ✅ Move educator route first — to avoid being overridden
discussionRouter.get("/educator/all",protectEducator, getAllCourseQuestions);

// Student + Educator shared routes
discussionRouter.get("/:courseId/:lectureId", getDiscussions); // lecture-level
discussionRouter.get("/:courseId", getDiscussions); // course-level

discussionRouter.post("/start", startDiscussion); // start new discussion
discussionRouter.post("/reply", replyToThread); // reply
discussionRouter.patch("/status", updateDiscussionStatus); // change status

export default discussionRouter;
