import axios from "axios";
import User from "../models/User.js";
import Course from "../models/Course.js";

const PYTHON_API = process.env.RECOMMENDER_API_URL || "http://127.0.0.1:5001";

/* 🧹 Helper — recursively clean Mongo ObjectIDs / numeric wrappers */
function cleanMongoObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (obj.$oid) return obj.$oid;
  if (obj.$numberInt) return parseInt(obj.$numberInt);
  if (obj.$numberLong) return parseInt(obj.$numberLong);
  if (obj.$date && obj.$date.$numberLong)
    return new Date(parseInt(obj.$date.$numberLong));
  const cleaned = {};
  for (const key in obj) cleaned[key] = cleanMongoObject(obj[key]);
  return cleaned;
}

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.auth.userId;

    // ⚡ Always fetch the latest user snapshot
    const userDoc = await User.findOne({ _id: userId })
      .populate("enrolledCourses")
      .lean();

    if (!userDoc)
      return res.status(404).json({ success: false, message: "User not found" });

    console.log("🧠 Live User Preferences (fresh from DB):", userDoc.preferences);
    console.log("👤 Enrolled Courses:", userDoc.enrolledCourses?.length || 0);

    // 🧩 Prepare user & course data
    const user = cleanMongoObject(userDoc);
    const allCourses = await Course.find({ isPublished: true }).lean();
    const courses = allCourses.map((c) => cleanMongoObject(c));

    const enrolledCoursesArray = Array.isArray(user.enrolledCourses)
      ? user.enrolledCourses
      : user.enrolledCourses
      ? Object.values(user.enrolledCourses)
      : [];

    // ✅ --- Preserve preferences properly ---
    const hasValidTopics =
      Array.isArray(user.preferences?.topics) &&
      user.preferences.topics.length > 0;
    const hasValidGoals =
      Array.isArray(user.preferences?.goals) &&
      user.preferences.goals.length > 0;
    const hasDifficulty =
      typeof user.preferences?.difficulty === "string" &&
      user.preferences.difficulty.trim() !== "";

    // Only fill missing ones
    if (!user.preferences) user.preferences = {};

    if (!hasValidTopics) {
      const topicPool = [];
      enrolledCoursesArray.forEach((course) => {
        if (course.courseTags?.length) topicPool.push(...course.courseTags);
        else if (course.courseTitle)
          topicPool.push(...course.courseTitle.split(" "));
      });
      user.preferences.topics = [
        ...new Set(topicPool.map((t) => t.toLowerCase())),
      ].slice(0, 5);
    }

    if (!hasValidGoals) {
      user.preferences.goals = ["skill improvement", "career growth"];
    }

    if (!hasDifficulty) {
      user.preferences.difficulty = "intermediate";
    }

    // 🧩 Add fallback activity logs for new users
    if (!user.activityLog?.length && enrolledCoursesArray?.length) {
      user.activityLog = enrolledCoursesArray.map((course) => ({
        action: "watched",
        courseId: course._id,
        details: {},
        timestamp: new Date(),
      }));
    }

    console.log("🧩 Final Preferences Sent to Python:", user.preferences);
    console.log("📚 Activity Count:", user.activityLog?.length || 0);

    // 🚀 Send to Python recommender
    const { data } = await axios.post(
      `${PYTHON_API}/recommend`,
      { user, courses },
      { timeout: 10000 }
    );

    console.log(
      "📥 Recommender Response:",
      data?.success ? "✅ Success" : "❌ Fail",
      "| Returned:",
      data?.recommended?.length || 0,
      "courses"
    );

    if (data.success && data.recommended?.length > 0) {
      return res.json({ success: true, recommended: data.recommended });
    }

    console.warn("⚠️ No personalized matches — returning fallback.");
    const fallback = await Course.find({ isPublished: true })
      .sort({ rating: -1, createdAt: -1 })
      .limit(5)
      .lean();

    return res.json({
      success: true,
      recommended: fallback,
      message:
        "No personalized matches found. Showing popular courses instead.",
    });
  } catch (err) {
    console.error("❌ Recommendation error:", err.message);

    const fallback = await Course.find({ isPublished: true })
      .sort({ rating: -1, createdAt: -1 })
      .limit(5)
      .lean();

    return res.json({
      success: false,
      recommended: fallback,
      message:
        "Recommender service unavailable. Showing top courses temporarily.",
    });
  }
};
