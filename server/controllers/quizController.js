// controllers/quizController.js
import { Quiz } from "../models/Quiz.js";
import Course from "../models/Course.js";
import User from "../models/User.js";

export const createQuiz = async (req, res) => {
    console.log("Creating quiz:", req.body, "Educator:", req.auth.userId);
  try {
    const educatorId = req.auth.userId;
    const { courseId, chapterId, title, questions, passPercentage } = req.body;

    const course = await Course.findById(courseId);
    if (!course || course.educator.toString() !== educatorId.toString()) {
  return res.json({
    success: false,
    message: "Unauthorized educator or invalid course",
  });
}


    const newQuiz = new Quiz({
      courseId,
      chapterId,
      title,
      questions,
      passPercentage,
    });

    await newQuiz.save();
    res.json({ success: true, message: "Quiz created successfully", quiz: newQuiz });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;
    const quizzes = await Quiz.find({ courseId });
    res.json({ success: true, quizzes });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const educatorId = req.auth.userId;

    const quiz = await Quiz.findById(quizId).populate("courseId", "educator");
    if (!quiz) return res.json({ success: false, message: "Quiz not found" });

    if (quiz.courseId.educator.toString() !== educatorId.toString()) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    await Quiz.findByIdAndDelete(quizId);
    res.json({ success: true, message: "Quiz deleted successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// 🧑‍🎓 Submit Quiz (Student)
export const submitQuiz = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { quizId, answers } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.json({ success: false, message: "Quiz not found" });

    const totalQuestions = quiz.questions.length;
    const correctAnswers = quiz.questions.filter((q) => {
      const selected = answers.find((a) => a.questionId === q._id.toString());
      const correctOption = q.options.find((o) => o.isCorrect);
      return selected?.selectedOption === correctOption?.text;
    }).length;

    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= quiz.passPercentage;

    await User.findByIdAndUpdate(userId, {
      $push: {
        activityLog: {
          courseId: quiz.courseId,
          action: "completed_quiz",
          details: { chapterId: quiz.chapterId, score, passed },
        },
      },
    });

    res.json({ success: true, score, passed });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getAllQuizzes = async (req, res) => {
  try {
    const educatorId = req.auth.userId;

    // Find all courses by this educator
    const educatorCourses = await Course.find({ educator: educatorId }).select("_id courseTitle");

    // Get all their course IDs
    const courseIds = educatorCourses.map((c) => c._id);

    // Fetch quizzes linked to those courses
    const quizzes = await Quiz.find({ courseId: { $in: courseIds } })
      .populate("courseId", "courseTitle");

    res.json({ success: true, quizzes });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.json({ success: false, message: error.message });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const educatorId = req.auth.userId;
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId).populate("courseId", "educator");
    if (!quiz) return res.json({ success: false, message: "Quiz not found" });

    if (quiz.courseId.educator.toString() !== educatorId.toString()) {
      return res.json({ success: false, message: "Unauthorized educator" });
    }

    const { title, passPercentage, questions } = req.body;

    // Basic validation
    if (!title || !questions?.length)
      return res.json({ success: false, message: "Invalid quiz data" });

    quiz.title = title;
    quiz.passPercentage = passPercentage;
    quiz.questions = questions;

    await quiz.save();

    res.json({ success: true, message: "Quiz updated successfully", quiz });
  } catch (error) {
    console.error("Update quiz error:", error);
    res.json({ success: false, message: error.message });
  }
};