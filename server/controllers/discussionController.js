import mongoose from "mongoose";
import { Discussion } from "../models/Discussion.js";
import { clerkClient } from "@clerk/express";
import { EDUCATOR_IDS } from "../configs/educators.js";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../utils/sendEmail.js";
import User from "../models/User.js";
import Course from "../models/Course.js"; // ✅ make sure to import Course

/**
 * ✅ 1. Get discussions for specific course or lecture
 */
export const getDiscussions = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;

    const query = { courseId: new mongoose.Types.ObjectId(courseId) };
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
      return res.json({ success: false, message: "Missing courseId or message" });

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

    // ✅ Notify the course educator via email
    const course = await Course.findById(courseId).lean();
    if (course && course.educator) {
      const educator = await User.findOne({ _id: course.educator });
      if (educator) {
        const link = `${process.env.FRONTEND_URL}/educator/student-questions`;;
        await sendEmail({
          to: educator.email,
          subject: `New Question in ${course.courseTitle}`,
          html: `
            <h2>Hello ${educator.name},</h2>
            <p>A student just asked a new question in your course <b>${course.courseTitle}</b>.</p>
            <a href="${link}" target="_blank" style="display:inline-block;padding:10px 16px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;">View Discussion</a>
            <p>— Hecademy Team</p>
          `,
        });
      }
    }

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
      return res.json({ success: false, message: "Missing required fields" });

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

    // ✅ Identify both parties
    const originalPosterId = thread.parentMessage.userId;
    const replier = await User.findOne({ _id: userId });
    const originalPoster = await User.findOne({ _id: originalPosterId });
    const course = await Course.findById(courseId).lean();

    // ✅ 1. If educator replied → notify student
    if (EDUCATOR_IDS.includes(userId) && originalPoster) {
      const link = `${process.env.FRONTEND_URL}/player/${courseId}?lecture=${lectureId || ""}`;
      await sendEmail({
        to: originalPoster.email,
        subject: `New Reply from Educator - ${course.courseTitle}`,
        html: `
          <h2>Hello ${originalPoster.name},</h2>
          <p>Your question in <b>${course.courseTitle}</b> just got a reply from your educator.</p>
          <a href="${link}" target="_blank" style="display:inline-block;padding:10px 16px;background:#10b981;color:white;border-radius:8px;text-decoration:none;">View Reply</a>
          <p>— Hecademy Team</p>
        `,
      });
    }

    // ✅ 2. If student replied → notify educator
    else if (!EDUCATOR_IDS.includes(userId) && course?.educator) {
      const educator = await User.findOne({ _id: course.educator });
      if (educator) {
        const link = `${process.env.FRONTEND_URL}/educator/student-questions`;
        await sendEmail({
          to: educator.email,
          subject: `New Student Reply in ${course.courseTitle}`,
          html: `
            <h2>Hello ${educator.name},</h2>
            <p>${replier?.name || "A student"} just replied to a discussion in your course <b>${course.courseTitle}</b>.</p>
            <a href="${link}" target="_blank" style="display:inline-block;padding:10px 16px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;">View Reply</a>
            <p>— Hecademy Team</p>
          `,
        });
      }
    }

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

    const lectureDiscussions = allDiscussions.filter((d) => !!d.lectureId);

    res.json({ success: true, discussions: lectureDiscussions });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
