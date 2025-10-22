import { Discussion } from "../models/Discussion.js";
import { clerkClient } from "@clerk/express";
import { EDUCATOR_IDS } from "../configs/educators.js";
import { v4 as uuidv4 } from "uuid";

// ✅ 1. Get all discussions for a specific course
export const getDiscussions = async (req, res) => {
  try {
    const { courseId } = req.params;

    const discussions = await Discussion.findOne({ courseId }).populate(
      "courseId",
      "courseTitle"
    );

    res.json({
      success: true,
      threads: discussions?.threads || [],
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ✅ 2. Start a new discussion thread (student)
export const startDiscussion = async (req, res) => {
  try {
    const { courseId, message } = req.body;
    const userId = req.auth.userId;

    if (!courseId || !message) {
      return res.json({
        success: false,
        message: "Missing courseId or message",
      });
    }

    // Clerk user info
    const user = await clerkClient.users.getUser(userId);
    const name = user.fullName || user.username || "User";
    const imageUrl = user.imageUrl || "";
    const isEducator = EDUCATOR_IDS.includes(userId);

    // Find or create course discussion document
    let discussion = await Discussion.findOne({ courseId });
    if (!discussion) discussion = new Discussion({ courseId, threads: [] });

    // New thread
    const thread = {
      questionId: uuidv4(),
      parentMessage: { userId, name, imageUrl, message, isEducator },
      replies: [],
      status: "open",
    };

    discussion.threads.push(thread);
    await discussion.save();

    res.json({ success: true, discussion });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ✅ 3. Reply to an existing discussion thread
export const replyToThread = async (req, res) => {
  try {
    const { courseId, questionId, message } = req.body;
    const userId = req.auth.userId;

    if (!courseId || !questionId || !message) {
      return res.json({
        success: false,
        message: "Missing courseId, questionId, or message",
      });
    }

    const user = await clerkClient.users.getUser(userId);
    const name = user.fullName || user.username || "User";
    const imageUrl = user.imageUrl || "";
    const isEducator = EDUCATOR_IDS.includes(userId);

    const discussion = await Discussion.findOne({ courseId });
    if (!discussion)
      return res.json({ success: false, message: "No discussion found" });

    const thread = discussion.threads.find((t) => t.questionId === questionId);
    if (!thread)
      return res.json({ success: false, message: "Thread not found" });

    thread.replies.push({ userId, name, imageUrl, message, isEducator });
    await discussion.save();

    res.json({ success: true, discussion });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ✅ 4. Update thread status (resolved / open)
export const updateDiscussionStatus = async (req, res) => {
  try {
    const { courseId, questionId, status } = req.body;

    const discussion = await Discussion.findOne({ courseId });
    if (!discussion)
      return res.json({ success: false, message: "Discussion not found" });

    const thread = discussion.threads.find((t) => t.questionId === questionId);
    if (!thread)
      return res.json({ success: false, message: "Thread not found" });

    thread.status = status;
    await discussion.save();

    res.json({
      success: true,
      message: `Discussion marked as ${status}`,
      discussion,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ✅ 5. Educator Dashboard – Get all student questions (grouped by course)
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
