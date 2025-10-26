import Course from "../models/Course.js";
import User from "../models/User.js";

// Fetch all feedback for educator's courses
export const getEducatorFeedbacks = async (req, res) => {
  try {
    const educatorId = req.auth.userId;

    // get educator’s courses and ratings
    const courses = await Course.find({ educator: educatorId })
      .select("courseTitle courseRatings")
      .lean();

    if (!courses || courses.length === 0) {
      return res.json({ success: true, feedback: [] });
    }

    // collect all userIds that gave feedback
    const userIds = courses.flatMap(c =>
      c.courseRatings
        .filter(r => r.feedback && r.feedback.trim())
        .map(r => r.userId)
    );

    // batch fetch user data
    const users = await User.find({ _id: { $in: userIds } })
      .select("name imageUrl email")
      .lean();

    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    // flatten feedbacks
    const allFeedback = [];
    for (const course of courses) {
      for (const rating of course.courseRatings) {
        if (rating.feedback && rating.feedback.trim()) {
          allFeedback.push({
            _id: rating._id,
            courseId: course._id,
            courseTitle: course.courseTitle,
            userId: rating.userId,
            feedback: rating.feedback,
            rating: rating.rating,
            date: rating.date,
            hidden: rating.hidden,
            user: userMap[rating.userId] || null,
          });
        }
      }
    }

    res.json({ success: true, feedback: allFeedback });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};// Hide / Unhide Feedback
export const toggleFeedbackVisibility = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const educatorId = req.auth.userId;

    // find course containing this feedback
    const course = await Course.findOne({
      educator: educatorId,
      "courseRatings._id": feedbackId,
    });

    if (!course) {
      return res.json({ success: false, message: "Feedback not found or unauthorized" });
    }

    const feedback = course.courseRatings.id(feedbackId);
    feedback.hidden = !feedback.hidden;

    await course.save();

    res.json({
      success: true,
      message: `Feedback ${feedback.hidden ? "hidden" : "unhidden"} successfully`,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
