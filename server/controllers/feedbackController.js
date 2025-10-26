import Course from "../models/Course.js";
import User from "../models/User.js";

// Fetch all feedback for educator's courses
export const getEducatorFeedbacks = async (req, res) => {
  try {
    const educatorId = req.auth.userId;

    const courses = await Course.find({ educator: educatorId })
      .select("courseTitle courseRatings")
      .lean();

    const allFeedback = [];

    for (const course of courses) {
      for (const rating of course.courseRatings) {
        if (rating.feedback && rating.feedback.trim() !== "") {
          const user = await User.findById(rating.userId).select("name imageUrl email");
          allFeedback.push({
            courseId: course._id,
            courseTitle: course.courseTitle,
            ...rating,
            user: user ? { name: user.name, imageUrl: user.imageUrl, email: user.email } : null,
          });
        }
      }
    }

    res.json({ success: true, feedback: allFeedback });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Hide / Unhide Feedback
export const toggleFeedbackVisibility = async (req, res) => {
  try {
    const { courseId, userId } = req.params;
    const educatorId = req.auth.userId;

    const course = await Course.findOne({ _id: courseId, educator: educatorId });
    if (!course) return res.json({ success: false, message: "Course not found or unauthorized" });

    const feedback = course.courseRatings.find((r) => r.userId === userId);
    if (!feedback) return res.json({ success: false, message: "Feedback not found" });

    feedback.hidden = !feedback.hidden;
    await course.save();

    res.json({
      success: true,
      message: `Feedback ${feedback.hidden ? "hidden" : "visible"} successfully`,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
