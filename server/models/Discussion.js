import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    imageUrl: { type: String },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    isEducator: { type: Boolean, default: false },
  },
  { _id: false }
);

const threadSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true }, // unique ID for thread
    parentMessage: replySchema, // student's main question
    replies: [replySchema],
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
    },
  },
  { _id: false }
);

const discussionSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture", // 👈 new field for per-lecture discussions
      required: false, // optional to keep old data valid
    },
    threads: [threadSchema],
  },
  { timestamps: true }
);

export const Discussion = mongoose.model("Discussion", discussionSchema);
