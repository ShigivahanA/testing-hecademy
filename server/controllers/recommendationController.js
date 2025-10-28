// controllers/recommendationController.js
import axios from "axios";
import User from "../models/User.js";
import Course from "../models/Course.js";

const PYTHON_API = process.env.RECOMMENDER_API_URL || "http://127.0.0.1:5001";

// Utility: recursively clean Mongo Object structure
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

    const user = cleanMongoObject(userDoc.toObject());
    const allCourses = await Course.find({ isPublished: true });
    const courses = allCourses.map((c) => cleanMongoObject(c.toObject()));

    // 🔗 Send data to Python recommender
    const { data } = await axios.post(
      `${PYTHON_API}/recommend`,
      { user, courses },
      { timeout: 8000 } // 8s safety timeout
    );

    // 🧹 Trim redundant fields before returning
    const cleanedRecommendations =
      data.recommended?.map((course) => ({
        _id: course._id,
        courseTitle: course.title || course.courseTitle,
        courseDescription: course.description || course.courseDescription,
        courseTags: course.tags || course.courseTags,
        difficulty: course.difficulty,
        rating: course.rating,
        score: course.score,
      })) || [];

    if (data.success && cleanedRecommendations.length > 0) {
      return res.json({ success: true, recommended: cleanedRecommendations });
    }

    // 🔁 Fallback: Top popular courses
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

    // Graceful fallback on timeout or connection failure
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
