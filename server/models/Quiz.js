// models/Quiz.js
import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
});

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [optionSchema],
});

const quizSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    chapterId: { type: String, required: true },
    title: { type: String, required: true },
    questions: [questionSchema],
    passPercentage: { type: Number, required: true, default: 80 },
  },
  { timestamps: true }
);

export const Quiz = mongoose.model("Quiz", quizSchema);
