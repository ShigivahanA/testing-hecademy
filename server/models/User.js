// models/User.js
import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  action: String, // e.g. "watched", "completed_quiz"
  details: {
    chapterId: { type: String },
    score: { type: Number },
    passed: { type: Boolean },
  },
  timestamp: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    imageUrl: { type: String, required: true },
    totalScore: { type: Number, default: 0 },
    enrolledCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    preferences: {
      topics: [String],
      difficulty: String,
      goals: [String],
    },
    activityLog: [activitySchema],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
