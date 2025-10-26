// controllers/feedbackController.js
import Course from "../models/Course.js";
import User from "../models/User.js";

export const getEducatorFeedbacks = async (req, res) => {
  try {
    const educatorId = req.auth.userId;
    console.log("Educator ID:", educatorId);

    // 🧑‍🏫 Fetch all courses created by this educator
    const courses = await Course.find({ educator: educatorId })
      .select("courseTitle courseRatings")
      .lean();

    if (!courses?.length) {
      console.log("No courses found for this educator");
      return res.json({ success: true, feedback: [] });
    }

    // 📦 Collect feedback entries with actual comments
    const feedbackEntries = [];
    for (const course of courses) {
      for (const r of course.courseRatings || []) {
        if (r.feedback && r.feedback.trim() !== "") {
          feedbackEntries.push({
            ...r,
            courseId: course._id,
            courseTitle: course.courseTitle,
          });
        }
      }
    }

    if (!feedbackEntries.length) {
      console.log("No feedback entries found in educator's courses");
      return res.json({ success: true, feedback: [] });
    }

    // 🧠 Collect all unique user IDs
    const userIds = [...new Set(feedbackEntries.map((f) => f.userId))];

    // 👤 Try to fetch users using both userId and fallback to _id
    const users = await User.find({
      $or: [{ userId: { $in: userIds } }, { _id: { $in: userIds } }],
    })
      .select("name imageUrl userId _id email")
      .lean();

    // Create lookup map for both userId and _id
    const userMap = {};
    users.forEach((u) => {
      if (u.userId) userMap[u.userId] = u;
      userMap[u._id?.toString()] = u;
    });

    // 🧩 Merge user data with feedbacks
    const allFeedback = feedbackEntries
      .map((f) => ({
        _id: f._id,
        courseId: f.courseId,
        courseTitle: f.courseTitle,
        userId: f.userId,
        feedback: f.feedback,
        rating: f.rating,
        date: f.date,
        hidden: f.hidden,
        user: userMap[f.userId] || { name: "Anonymous", imageUrl: null },
      }))
      // 🕓 Sort by most recent first
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, feedback: allFeedback });
  } catch (error) {
    console.error("Error fetching educator feedbacks:", error);
    res.json({ success: false, message: error.message });
  }
};


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
