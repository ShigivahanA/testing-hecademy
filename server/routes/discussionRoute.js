import express from "express";
import {
  getDiscussions,
  startDiscussion,
  replyToThread,
  updateDiscussionStatus,
  getAllCourseQuestions,
} from "../controllers/discussionController.js";

const discussionRouter = express.Router();

discussionRouter.get("/:courseId", getDiscussions);                 // course-level
discussionRouter.get("/:courseId/:lectureId", getDiscussions);      // lecture-level

discussionRouter.post("/start", startDiscussion);                   // start discussion
discussionRouter.post("/reply", replyToThread);                     // reply to thread
discussionRouter.patch("/status", updateDiscussionStatus);          // update status

// 👩‍🏫 Educator dashboard route
discussionRouter.get("/educator/all", getAllCourseQuestions);

export default discussionRouter;
