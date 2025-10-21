import mongoose from "mongoose";

const courseProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    courseId: { type: String, required: true },
    completed: { type: Boolean, default: false },
    totalScore: { type: Number, default: 0 },

    // Now each completed lecture stores metadata
    lectureCompleted: [
      {
        lectureId: { type: String, required: true },
        duration: { type: Number, default: 0 }, // minutes
        completedAt: { type: Date, default: Date.now },
        score: { type: Number, default: 10 },
      },
    ],
  },
  { minimize: false, timestamps: true }
);

export const CourseProgress = mongoose.model(
  "CourseProgress",
  courseProgressSchema
);
