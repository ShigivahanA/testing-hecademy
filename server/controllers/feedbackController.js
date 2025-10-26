// controllers/feedbackController.js
import Course from "../models/Course.js";
import User from "../models/User.js";

/* -------------------------------------------------------------------------- */
/* 🧑‍🏫 Get all feedback for educator’s courses                               */
/* -------------------------------------------------------------------------- */
export const getEducatorFeedbacks = async (req, res) => {
  try {
    const educatorId = req.auth.userId;

    // Find all courses owned by this educator
    const courses = await Course.find({ educator: educatorId })
      .select("courseTitle courseRatings")
      .lean();

    if (!courses || courses.length === 0) {
      return res.json({ success: true, feedback: [] });
    }

    // Collect all userIds who gave feedback
    const userIds = courses.flatMap((c) =>
      c.courseRatings
        .filter((r) => r.feedback && r.feedback.trim())
        .map((r) => r.userId)
    );

    // 🧠 Fetch user details (name + image)
    // NOTE: using userId since you store Clerk ID as string
    const users = await User.find({ userId: { $in: userIds } })
      .select("name imageUrl email userId")
      .lean();

    const userMap = Object.fromEntries(users.map((u) => [u.userId, u]));

    // 🧩 Build a flattened feedback list
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
    console.error("Error fetching feedbacks:", error);
    res.json({ success: false, message: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 👁️ Toggle Feedback Visibility (Hide / Unhide)                             */
/* -------------------------------------------------------------------------- */
export const toggleFeedbackVisibility = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const educatorId = req.auth.userId;

    // Find the course that contains this feedback (and belongs to this educator)
    const course = await Course.findOne({
      educator: educatorId,
      "courseRatings._id": feedbackId,
    });

    if (!course) {
      return res.json({
        success: false,
        message: "Feedback not found or unauthorized",
      });
    }

    // Find and toggle the feedback’s visibility
    const feedback = course.courseRatings.id(feedbackId);
    feedback.hidden = !feedback.hidden;
    await course.save();

    res.json({
      success: true,
      message: `Feedback ${feedback.hidden ? "hidden" : "unhidden"} successfully`,
    });
  } catch (error) {
    console.error("Error toggling feedback visibility:", error);
    res.json({ success: false, message: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🧑‍🎓 Get feedbacks for a specific course (public/student use)             */
/* -------------------------------------------------------------------------- */
export const getCourseFeedbacks = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .select("courseRatings courseTitle")
      .lean();

    if (!course)
      return res.json({ success: false, message: "Course not found" });

    // Only include visible feedback
    const visibleFeedback = course.courseRatings.filter(
      (f) => f.feedback && f.feedback.trim() && !f.hidden
    );

    // Fetch reviewer names & images
    const userIds = visibleFeedback.map((f) => f.userId);
    const users = await User.find({ userId: { $in: userIds } })
      .select("name imageUrl userId")
      .lean();

    const userMap = Object.fromEntries(users.map((u) => [u.userId, u]));

    const formattedFeedback = visibleFeedback.map((f) => ({
      _id: f._id,
      rating: f.rating,
      feedback: f.feedback,
      date: f.date,
      user: userMap[f.userId] || { name: "Anonymous" },
    }));

    res.json({
      success: true,
      courseTitle: course.courseTitle,
      feedback: formattedFeedback,
    });
  } catch (error) {
    console.error("Error getting course feedbacks:", error);
    res.json({ success: false, message: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🧑‍🏫 Delete a feedback (if needed later)                                  */
/* -------------------------------------------------------------------------- */
export const deleteFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const educatorId = req.auth.userId;

    const course = await Course.findOne({
      educator: educatorId,
      "courseRatings._id": feedbackId,
    });

    if (!course)
      return res.json({
        success: false,
        message: "Feedback not found or unauthorized",
      });

    // Remove the feedback
    course.courseRatings = course.courseRatings.filter(
      (f) => f._id.toString() !== feedbackId
    );

    await course.save();
    res.json({ success: true, message: "Feedback deleted successfully" });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    res.json({ success: false, message: error.message });
  }
};
