import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    imageUrl: { type: String, required: true },
    totalScore: { type: Number, default: 0 },
    enrolledCourses: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        }
    ],
    preferences: {
    topics: [String],      
    difficulty: String,    
    goals: [String]        
  },
  activityLog: [
    {
      courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
      action: String,   
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User