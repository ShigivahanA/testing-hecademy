import User from "../models/User.js";
import Course from "../models/Course.js";

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findById(userId).populate("enrolledCourses");

    if (!user) return res.json({ success: false, message: "User not found" });

    // 1. Get all courses
    const allCourses = await Course.find({ isPublished: true });

    // 2. Build user keywords (preferences + enrolled course tags)
    let keywords = [...(user.preferences?.topics || [])];

    // 3. Filter courses by tags
    let recommended = allCourses.filter(c => {
      const courseTags = c.tags || [];
      return courseTags.some(tag =>
        keywords.map(k => k.toLowerCase()).includes(tag.toLowerCase())
      );
    }).filter(c =>
      !user.enrolledCourses.map(ec => ec._id.toString()).includes(c._id.toString())
    );

    // 4. If no matches, return empty with message
    if (recommended.length === 0) {
      return res.json({
        success: true,
        recommended: [],
        message: "No recommended courses based on your interests"
      });
    }

    // 5. Return recommendations
    res.json({ success: true, recommended, fallback: false });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};
