import { Discussion } from "../models/Discussion.js";
import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js";
import { EDUCATOR_IDS } from "../configs/educators.js";

// Get all discussions for a course
export const getDiscussions = async (req, res) => {
  try {
    const { courseId } = req.params;
    const discussions = await Discussion.findOne({ courseId });
    res.json({ success: true, thread: discussions?.thread || [] });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Add message (student or educator)
export const addMessage = async (req, res) => {
  try {
    const { courseId, message } = req.body;
    const userId = req.auth.userId;
    if (!message || !courseId) {
      return res.json({ success: false, message: "Missing message or courseId" });
    }

    const user = await clerkClient.users.getUser(userId);
    const name = user.fullName || user.username || "User";
    const imageUrl = user.imageUrl || "";
    const isEducator = EDUCATOR_IDS.includes(userId);

    // Create or append to discussion
    let discussion = await Discussion.findOne({ courseId });
    if (!discussion) discussion = new Discussion({ courseId, thread: [] });

    discussion.thread.push({
      userId,
      name,
      imageUrl,
      message,
      createdAt: new Date(),
      isEducator, // ✅ store this
    });

    await discussion.save();
    res.json({ success: true, thread: discussion.thread });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get all questions (for educator dashboard)
export const getAllCourseQuestions = async (req, res) => {
  try {
    const allDiscussions = await Discussion.find({})
      .populate("courseId", "courseTitle")
      .lean();

    res.json({ success: true, discussions: allDiscussions });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
