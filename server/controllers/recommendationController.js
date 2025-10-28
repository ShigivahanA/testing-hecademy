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

    if (!userDoc) return res.json({ success: false, message: "User not found" });

    const user = cleanMongoObject(userDoc.toObject());
    const allCourses = await Course.find({ isPublished: true });
    const courses = allCourses.map(c => cleanMongoObject(c.toObject()));

    // send data to python
    const { data } = await axios.post(`${PYTHON_API}/recommend`, {
      user,
      courses,
    });

    if (data.success && data.recommended?.length > 0) {
      return res.json({ success: true, recommended: data.recommended });
    }

    // fallback if empty
    const fallback = await Course.find({ isPublished: true })
      .sort({ rating: -1, createdAt: -1 })
      .limit(5);

    return res.json({
      success: true,
      recommended: fallback,
      message: "No personalized matches found. Showing popular courses instead.",
    });
  } catch (err) {
    console.error("Recommendation error:", err.message);
    return res.json({ success: false, message: err.message });
  }
};
