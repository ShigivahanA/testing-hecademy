import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },        // Clerk user ID
    name: { type: String, required: true },          // Display name
    imageUrl: { type: String },                      // Avatar image
    message: { type: String, required: true },       // Message text
    createdAt: { type: Date, default: Date.now },    // Timestamp
    isEducator: { type: Boolean, default: false },   // ✅ NEW: flag for educator replies
  },
  { _id: false }
);

const discussionSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    thread: [replySchema],                           // Array of messages in the discussion
  },
  { timestamps: true }
);

export const Discussion = mongoose.model("Discussion", discussionSchema);
