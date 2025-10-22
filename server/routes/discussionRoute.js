import express from "express";
import {
  getDiscussions,
  startDiscussion,
  replyToThread,
  updateDiscussionStatus,
  getAllCourseQuestions,
} from "../controllers/discussionController.js";

const discussionRouter = express.Router();

// Student + Educator shared routes
discussionRouter.get("/:courseId",getDiscussions);
discussionRouter.post("/start", startDiscussion);
discussionRouter.post("/reply", replyToThread);
discussionRouter.patch("/status", updateDiscussionStatus);

// Educator dashboard
discussionRouter.get("/educator/all", getAllCourseQuestions);

export default discussionRouter;
