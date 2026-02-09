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
          subject: `NODE_SIGNAL: New Question in ${course.courseTitle}`,
          html: `
            <div style="font-family: 'Inter', system-ui, sans-serif; background-color: #F5F5F7; padding: 40px; color: #1D1616;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid rgba(0,0,0,0.05); border-radius: 32px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.05);">
                <div style="background-color: #1D1616; padding: 24px 40px; border-bottom: 4px solid #D84040;">
                  <h1 style="color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; margin: 0;">Transmission_Received</h1>
                </div>
                <div style="padding: 40px;">
                  <h2 style="font-size: 24px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.02em; margin-bottom: 8px;">Hello ${educator.name},</h2>
                  <p style="font-size: 14px; font-weight: 500; color: rgba(0,0,0,0.6); line-height: 1.6; margin-bottom: 32px;">
                    A student operative has initiated a new discussion thread in your archive. Action is requested to maintain synchronization.
                  </p>
                  <div style="background-color: #F5F5F7; border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; padding: 24px; margin-bottom: 32px;">
                    <div style="margin-bottom: 16px;">
                      <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #D84040;">Target_Module</span>
                      <h3 style="font-size: 16px; font-weight: 900; text-transform: uppercase; font-style: italic; margin-top: 4px; margin-bottom: 0;">${course.courseTitle}</h3>
                    </div>
                    <div style="border-left: 3px solid rgba(0,0,0,0.1); padding-left: 16px;">
                      <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(0,0,0,0.3);">Payload_Preview</span>
                      <p style="font-size: 13px; font-weight: 500; font-style: italic; color: rgba(0,0,0,0.7); margin-top: 4px; margin-bottom: 0;">"${message.length > 100 ? message.substring(0, 100) + '...' : message}"</p>
                    </div>
                  </div>
                  <a href="${link}" style="display: block; text-align: center; background-color: #1D1616; color: #ffffff; padding: 20px; border-radius: 16px; text-decoration: none; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em;">Access_Comms_Terminal</a>
                  <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(0,0,0,0.05); text-align: center;">
                    <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5em; color: rgba(0,0,0,0.2);">HECADEMY_OS_INTELLIGENCE</span>
                  </div>
                </div>
              </div>
            </div>
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
        subject: `NODE_SIGNAL: Educator Response in ${course.courseTitle}`,
        html: `
          <div style="font-family: 'Inter', system-ui, sans-serif; background-color: #F5F5F7; padding: 40px; color: #1D1616;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid rgba(0,0,0,0.05); border-radius: 32px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.05);">
              <div style="background-color: #22c55e; padding: 24px 40px; border-bottom: 4px solid #1D1616;">
                <h1 style="color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; margin: 0;">Synchronization_Complete</h1>
              </div>
              <div style="padding: 40px;">
                <h2 style="font-size: 24px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.02em; margin-bottom: 8px;">Hello ${originalPoster.name},</h2>
                <p style="font-size: 14px; font-weight: 500; color: rgba(0,0,0,0.6); line-height: 1.6; margin-bottom: 32px;">
                  The educator has synchronized a response to your discussion thread. Your nodal intelligence has been updated.
                </p>
                <div style="background-color: #F5F5F7; border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; padding: 24px; margin-bottom: 32px;">
                  <div style="margin-bottom: 16px;">
                    <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #22c55e;">Target_Archive</span>
                    <h3 style="font-size: 16px; font-weight: 900; text-transform: uppercase; font-style: italic; margin-top: 4px; margin-bottom: 0;">${course.courseTitle}</h3>
                  </div>
                  <div style="border-left: 3px solid rgba(0,0,0,0.1); padding-left: 16px;">
                    <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(0,0,0,0.3);">Response_Payload</span>
                    <p style="font-size: 13px; font-weight: 500; font-style: italic; color: rgba(0,0,0,0.7); margin-top: 4px; margin-bottom: 0;">"${message.length > 100 ? message.substring(0, 100) + '...' : message}"</p>
                  </div>
                </div>
                <a href="${link}" style="display: block; text-align: center; background-color: #1D1616; color: #ffffff; padding: 20px; border-radius: 16px; text-decoration: none; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em;">View_Full_Transmission</a>
                <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(0,0,0,0.05); text-align: center;">
                  <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5em; color: rgba(0,0,0,0.2);">HECADEMY_OS_INTELLIGENCE</span>
                </div>
              </div>
            </div>
          </div>
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
          subject: `NODE_SIGNAL: New Student Reply in ${course.courseTitle}`,
          html: `
            <div style="font-family: 'Inter', system-ui, sans-serif; background-color: #F5F5F7; padding: 40px; color: #1D1616;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid rgba(0,0,0,0.05); border-radius: 32px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.05);">
                <div style="background-color: #1D1616; padding: 24px 40px; border-bottom: 4px solid #D84040;">
                  <h1 style="color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; margin: 0;">Transmission_Received</h1>
                </div>
                <div style="padding: 40px;">
                  <h2 style="font-size: 24px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.02em; margin-bottom: 8px;">Hello ${educator.name},</h2>
                  <p style="font-size: 14px; font-weight: 500; color: rgba(0,0,0,0.6); line-height: 1.6; margin-bottom: 32px;">
                    Student operative <b>${replier?.name || "Unknown"}</b> has added a reply to an existing discussion thread.
                  </p>
                  <div style="background-color: #F5F5F7; border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; padding: 24px; margin-bottom: 32px;">
                    <div style="margin-bottom: 16px;">
                      <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #D84040;">Target_Module</span>
                      <h3 style="font-size: 16px; font-weight: 900; text-transform: uppercase; font-style: italic; margin-top: 4px; margin-bottom: 0;">${course.courseTitle}</h3>
                    </div>
                    <div style="border-left: 3px solid rgba(0,0,0,0.1); padding-left: 16px;">
                      <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(0,0,0,0.3);">Reply_Payload</span>
                      <p style="font-size: 13px; font-weight: 500; font-style: italic; color: rgba(0,0,0,0.7); margin-top: 4px; margin-bottom: 0;">"${message.length > 100 ? message.substring(0, 100) + '...' : message}"</p>
                    </div>
                  </div>
                  <a href="${link}" style="display: block; text-align: center; background-color: #1D1616; color: #ffffff; padding: 20px; border-radius: 16px; text-decoration: none; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em;">Access_Comms_Terminal</a>
                  <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(0,0,0,0.05); text-align: center;">
                    <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5em; color: rgba(0,0,0,0.2);">HECADEMY_OS_INTELLIGENCE</span>
                  </div>
                </div>
              </div>
            </div>
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
