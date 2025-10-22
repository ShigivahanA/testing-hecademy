import mongoose from "mongoose";
import { Discussion } from "../models/Discussion.js";
import { clerkClient } from "@clerk/express";
import { EDUCATOR_IDS } from "../configs/educators.js";
import { v4 as uuidv4 } from "uuid";

/**
 * ✅ 1. Get discussions for specific course or lecture
 */
export const getDiscussions = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;

    const query = {
      courseId: new mongoose.Types.ObjectId(courseId),
    };
    if (lectureId) query.lectureId = lectureId;

    const discussions = await Discussion.findOne(query)
      .populate("courseId", "courseTitle courseContent")
      .lean();

    res.json({
      success: true,
      threads: discussions?.threads || [],
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/**
 * ✅ 2. Start a new discussion (Student)
 */
export const startDiscussion = async (req, res) => {
  try {
    const { courseId, lectureId, message } = req.body;
    const userId = req.auth.userId;

    if (!courseId || !message)
      return res.json({
        success: false,
        message: "Missing courseId or message",
      });

    const user = await clerkClient.users.getUser(userId);
    const name = user.fullName || user.username || "User";
    const imageUrl = user.imageUrl || "";
    const isEducator = EDUCATOR_IDS.includes(userId);

    // 🔍 Find or create discussion doc per course + lecture
    let discussion = await Discussion.findOne({
      courseId: new mongoose.Types.ObjectId(courseId),
      lectureId: lectureId || null,
    });

    if (!discussion)
      discussion = new Discussion({ courseId, lectureId, threads: [] });

    const thread = {
      questionId: uuidv4(),
      parentMessage: { userId, name, imageUrl, message, isEducator },
      replies: [],
      status: "open",
    };

    discussion.threads.push(thread);
    await discussion.save();

    res.json({ success: true, message: "Discussion started", discussion });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/**
 * ✅ 3. Reply to a discussion (Student / Educator)
 */
export const replyToThread = async (req, res) => {
  try {
    const { courseId, lectureId, questionId, message } = req.body;
    const userId = req.auth.userId;

    if (!courseId || !questionId || !message)
      return res.json({
        success: false,
        message: "Missing required fields",
      });

    const user = await clerkClient.users.getUser(userId);
    const name = user.fullName || user.username || "User";
    const imageUrl = user.imageUrl || "";
    const isEducator = EDUCATOR_IDS.includes(userId);

    const discussion = await Discussion.findOne({
      courseId: new mongoose.Types.ObjectId(courseId),
      lectureId: lectureId || null,
    });

    if (!discussion)
      return res.json({ success: false, message: "No discussion found" });

    const thread = discussion.threads.find((t) => t.questionId === questionId);
    if (!thread)
      return res.json({ success: false, message: "Thread not found" });

    thread.replies.push({ userId, name, imageUrl, message, isEducator });
    await discussion.save();

    res.json({ success: true, message: "Reply added", discussion });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/**
 * ✅ 4. Update discussion status
 */
export const updateDiscussionStatus = async (req, res) => {
  try {
    const { courseId, lectureId, questionId, status } = req.body;

    const discussion = await Discussion.findOne({
      courseId: new mongoose.Types.ObjectId(courseId),
      lectureId: lectureId || null,
    });

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

/**
 * ✅ 5. Educator Dashboard – All lecture discussions (grouped)
 */
export const getAllCourseQuestions = async (req, res) => {
  try {
    const allDiscussions = await Discussion.find({})
      .populate("courseId", "courseTitle courseContent")
      .lean();

    // Filter: show only lecture-level
    const lectureDiscussions = allDiscussions.filter((d) => !!d.lectureId);

    res.json({ success: true, discussions: lectureDiscussions });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
