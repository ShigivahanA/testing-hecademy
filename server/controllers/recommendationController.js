import User from "../models/User.js";
import Course from "../models/Course.js";
import natural from "natural";  // TF-IDF (lightweight)

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findById(userId).populate("enrolledCourses");

    if (!user) return res.json({ success: false, message: "User not found" });

    // 1. Get all courses
    const allCourses = await Course.find({ isPublished: true });

    // 2. Build user keywords (preferences + enrolled course tags)
    let keywords = [...(user.preferences?.topics || [])];
    user.enrolledCourses.forEach(c => {
      keywords.push(...(c.tags || []));
    });

    let recommended = allCourses.filter(c => {
      const courseTags = c.tags || [];
      return courseTags.some(tag =>
        keywords.map(k => k.toLowerCase()).includes(tag.toLowerCase())
      );
    }).filter(c =>
      !user.enrolledCourses.map(ec => ec._id.toString()).includes(c._id.toString())
    );

    // 4. If no matches, fallback to popular courses (by enrollment count)
    if (recommended.length === 0) {
      const popularCourses = await Course.find({ isPublished: true })
        .sort({ enrollmentCount: -1 }) // ✅ needs enrollmentCount field in Course model
        .limit(10);

      return res.json({
        success: true,
        recommended: popularCourses,
        fallback: true, // 👈 flag so frontend can show "Popular amongst learners"
      });
    }

    res.json({ success: true, recommended, fallback: false });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};