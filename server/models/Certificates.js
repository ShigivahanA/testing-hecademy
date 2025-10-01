import mongoose from "mongoose";

const CertificateSchema = new mongoose.Schema({
  userId: {
        type: String,
        ref: 'User',
        required: true
    },
    courseId: { type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
      certificateId: { type: String, unique: true, required: true },
  issueDate: { type: Date, default: Date.now },
}, { timestamps: true });

export const Certificate = mongoose.model("Certificate", CertificateSchema);
