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

    const recommended = allCourses.filter(c => {
          const courseTags = c.tags || [];
          return courseTags.some(tag =>
            keywords.map(k => k.toLowerCase()).includes(tag.toLowerCase())
          );
        })
        .filter(c => !user.enrolledCourses.map(ec => ec._id.toString()).includes(c._id.toString())) // remove enrolled
        .slice(0, 10); // limit results

        res.json({ success: true, recommended });
      } catch (err) {
        res.json({ success: false, message: err.message });
      }
    };
