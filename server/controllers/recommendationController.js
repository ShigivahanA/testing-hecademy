import User from "../models/User.js";
import Course from "../models/Course.js";

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findById(userId).populate("enrolledCourses");
    if (!user) return res.json({ success: false, message: "User not found" });

    const allCourses = await Course.find({ isPublished: true });

    // Send data to Python microservice
    const { data } = await axios.post("http://127.0.0.1:5001/recommend", {
      user,
      courses: allCourses,
    });

    if (data.success) {
      res.json({ success: true, recommended: data.recommended });
    } else {
      res.json({ success: false, message: data.error });
    }
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};