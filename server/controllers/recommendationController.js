import axios from "axios";
import User from "../models/User.js";
import Course from "../models/Course.js";

const PYTHON_API = process.env.RECOMMENDER_API_URL || "http://127.0.0.1:5001";

// 🧹 Helper — recursively clean Mongo ObjectIDs / numeric wrappers
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
    const userDoc = await User.findById(userId).populate("enrolledCourses");

    if (!userDoc)
      return res.status(404).json({ success: false, message: "User not found" });

    // 🧩 Prepare user + courses data
    let user = cleanMongoObject(userDoc.toObject());
    const allCourses = await Course.find({ isPublished: true });
    const courses = allCourses.map((c) => cleanMongoObject(c.toObject()));

    // ✅ Normalize enrolledCourses safely
    let enrolledCoursesArray = [];
    if (Array.isArray(user.enrolledCourses)) {
      enrolledCoursesArray = user.enrolledCourses;
    } else if (user.enrolledCourses && typeof user.enrolledCourses === "object") {
      enrolledCoursesArray = Object.values(user.enrolledCourses);
    } else {
      enrolledCoursesArray = [];
    }

    console.log("👤 Enrolled Courses Count:", enrolledCoursesArray.length);

    // 🧠 Auto-fill missing preferences from user data
    if (
      !user.preferences ||
      (!user.preferences.topics?.length && !user.preferences.goals?.length)
    ) {
      const topicPool = [];

      enrolledCoursesArray.forEach((course) => {
        if (course.courseTags?.length) {
          topicPool.push(...course.courseTags);
        } else if (course.courseTitle) {
          // fallback: extract keywords from title
          topicPool.push(...course.courseTitle.split(" "));
        }
      });

      user.preferences = {
        topics: [...new Set(topicPool.map((t) => t.toLowerCase()))].slice(0, 5),
        goals: ["skill improvement", "career growth"],
        difficulty: user.preferences?.difficulty || "intermediate",
      };
    }

    // 🧩 Ensure some activity data exists
    if (!user.activityLog?.length && enrolledCoursesArray?.length) {
      user.activityLog = enrolledCoursesArray.map((course) => ({
        action: "watched",
        courseId: course._id,
        details: {},
        timestamp: new Date(),
      }));
    }

    console.log("🧠 Preferences:", user.preferences);
    console.log("📚 Activity Count:", user.activityLog?.length);

    // 🚀 Send to Python recommender
    const { data } = await axios.post(
      `${PYTHON_API}/recommend`,
      { user, courses },
      { timeout: 10000 }
    );

    console.log("📥 Recommender Response:", data?.recommended?.length || 0, "items");

    if (data.success && data.recommended?.length > 0) {
      return res.json({ success: true, recommended: data.recommended });
    }

    // 🔁 Fallback: top-rated or latest courses
    console.warn("⚠️ No personalized matches — returning fallback.");
    const fallback = await Course.find({ isPublished: true })
      .sort({ rating: -1, createdAt: -1 })
      .limit(5);

    return res.json({
      success: true,
      recommended: fallback,
      message: "No personalized matches found. Showing popular courses instead.",
    });
  } catch (err) {
    console.error("❌ Recommendation error:", err.message);
    const fallback = await Course.find({ isPublished: true })
      .sort({ rating: -1, createdAt: -1 })
      .limit(5);

    return res.json({
      success: false,
      recommended: fallback,
      message:
        "Recommender service unavailable. Showing top courses temporarily.",
    });
  }
};
