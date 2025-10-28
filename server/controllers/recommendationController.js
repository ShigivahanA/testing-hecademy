import axios from "axios";
import User from "../models/User.js";
import Course from "../models/Course.js";

const PYTHON_API = process.env.RECOMMENDER_API_URL || "http://127.0.0.1:5001";

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

    let user = cleanMongoObject(userDoc.toObject());
    const allCourses = await Course.find({ isPublished: true });
    const courses = allCourses.map((c) => cleanMongoObject(c.toObject()));

    // 🧩 Auto-fill missing preferences for better personalization
    if (
      !user.preferences ||
      (!user.preferences.topics?.length && !user.preferences.goals?.length)
    ) {
      const topicPool = [];
      user.enrolledCourses.forEach((course) => {
        if (course.courseTags?.length)
          topicPool.push(...course.courseTags.slice(0, 3));
      });

      user.preferences = {
        topics: [...new Set(topicPool)].slice(0, 3),
        goals: ["skill improvement"],
        difficulty: user.preferences?.difficulty || "intermediate",
      };
    }

    // 🧠 Add some fallback logs if empty
    if (!user.activityLog?.length && user.enrolledCourses?.length) {
      user.activityLog = user.enrolledCourses.map((course) => ({
        action: "watched",
        courseId: course._id,
        details: {},
        timestamp: new Date(),
      }));
    }

    console.log("👤 User prefs:", user.preferences);
    console.log("📚 Activity count:", user.activityLog?.length);

    // 🔗 Send data to Python recommender
    const { data } = await axios.post(
      `${PYTHON_API}/recommend`,
      { user, courses },
      { timeout: 10000 }
    );

    console.log("📥 Response from recommender:", data);

    if (data.success && data.recommended?.length > 0) {
      return res.json({ success: true, recommended: data.recommended });
    }

    console.warn("⚠️ No personalized matches, returning fallback...");
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
