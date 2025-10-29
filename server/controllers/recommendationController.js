import axios from "axios";
import User from "../models/User.js";
import Course from "../models/Course.js";

const PYTHON_API = process.env.RECOMMENDER_API_URL || "http://127.0.0.1:5001";

/* 🧹 Clean MongoDB-style objects deeply */
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
    const userDoc = await User.findOne({ _id: userId })
      .populate("enrolledCourses")
      .lean();

    if (!userDoc)
      return res.status(404).json({ success: false, message: "User not found" });

    console.log("🧠 Live User Preferences (fresh from DB):", userDoc.preferences);
    console.log("👤 Enrolled Courses:", userDoc.enrolledCourses?.length || 0);

    const preservedPreferences = {
      topics: Array.isArray(userDoc.preferences?.topics)
        ? [...userDoc.preferences.topics]
        : [],
      goals: Array.isArray(userDoc.preferences?.goals)
        ? [...userDoc.preferences.goals]
        : [],
      difficulty: userDoc.preferences?.difficulty || "",
    };

    const user = cleanMongoObject(userDoc);
    const allCourses = await Course.find({ isPublished: true }).lean();
    const courses = allCourses.map((c) => cleanMongoObject(c));

    const enrolledCoursesArray = Array.isArray(user.enrolledCourses)
      ? user.enrolledCourses
      : Object.values(user.enrolledCourses || {});

    user.preferences = { ...preservedPreferences };

    if (!user.preferences.topics?.length) {
      const topicPool = [];
      enrolledCoursesArray.forEach((c) => {
        if (c.courseTags?.length) topicPool.push(...c.courseTags);
        else if (c.courseTitle)
          topicPool.push(...c.courseTitle.split(" "));
      });
      user.preferences.topics = [...new Set(topicPool.map((t) => t.toLowerCase()))].slice(0, 5);
    }

    if (!user.preferences.goals?.length)
      user.preferences.goals = ["skill improvement", "career growth"];

    if (!user.preferences.difficulty)
      user.preferences.difficulty = "intermediate";

    if (!user.activityLog?.length && enrolledCoursesArray?.length) {
      user.activityLog = enrolledCoursesArray.map((c) => ({
        action: "watched",
        courseId: c._id,
        details: {},
        timestamp: new Date(),
      }));
    }

    console.log("🧩 Final Preferences Sent to Python:", user.preferences);
    console.log("📚 Activity Count:", user.activityLog?.length || 0);

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
      const cleanedRecommendations = data.recommended
        .map((course, i) => {
          let cleanId = course._id;
          try {
            if (!cleanId) {
              cleanId = course.id || course.courseId || "";
            } else if (typeof cleanId === "object") {
              if (cleanId.$oid) cleanId = cleanId.$oid;
              else if (cleanId.buffer?.data)
                cleanId = Buffer.from(cleanId.buffer.data).toString("hex");
              else cleanId = JSON.stringify(cleanId);
            }

            cleanId = String(cleanId).trim();

            if (!cleanId || cleanId.includes("object") || cleanId.length < 10) {
              console.warn(`⚠️ Skipping invalid ID for ${course.title || course.courseTitle}`);
              return null;
            }
          } catch (err) {
            console.warn(`⚠️ ID cleaning failed at index ${i}:`, err.message);
            return null;
          }

          return { ...course, _id: cleanId };
        })
        .filter(Boolean);

      console.log(
        "🧼 Cleaned Recommendation IDs:",
        cleanedRecommendations.map((c) => c._id)
      );

      if (cleanedRecommendations.length === 0) {
        console.warn("⚠️ All recommended IDs invalid — fallback activated.");
        const fallback = await Course.find({ isPublished: true })
          .sort({ rating: -1, createdAt: -1 })
          .limit(5)
          .lean();
        return res.json({
          success: true,
          recommended: fallback,
          message: "Fallback returned (invalid IDs).",
        });
      }

      return res.json({ success: true, recommended: cleanedRecommendations });
    }

    console.warn("⚠️ No personalized matches — fallback mode.");
    const fallback = await Course.find({ isPublished: true })
      .sort({ rating: -1, createdAt: -1 })
      .limit(5)
      .lean();

    return res.json({
      success: true,
      recommended: fallback,
      message: "No personalized matches. Showing popular courses.",
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
      message: "Recommender service unavailable. Showing top courses.",
    });
  }
};
