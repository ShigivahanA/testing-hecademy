import { Certificate } from "../models/Certificates.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import { v2 as cloudinary } from 'cloudinary'


// Issue a certificate
export const issueCertificate = async (req, res) => {
  try {
    const userId = req.auth.userId; 
    const { courseId } = req.body;
    const file = req.file; // 👈 assuming multer is set up

    // Ensure user & course exist
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);
    if (!user || !course) {
      return res.json({ success: false, message: "User or course not found" });
    }

    // Check if already issued
    let existing = await Certificate.findOne({ userId, courseId });
    if (existing) {
      return res.json({ success: true, certificate: existing });
    }

    if (!file) {
      return res.json({ success: false, message: "Certificate file missing" });
    }

    // Upload certificate PDF/image to Cloudinary
    const uploadRes = await cloudinary.uploader.upload(file.path, {
      folder: "certificates",
      resource_type: "auto", // handles PDF or image
    });

    // Create new certificate record
    const certificateId = Math.random().toString(36).substr(2, 9).toUpperCase();
    const newCertificate = await Certificate.create({
      userId,
      courseId,
      certificateId,
      certificateUrl: uploadRes.secure_url, // ✅ save URL
    });

    res.json({ success: true, certificate: newCertificate });
  } catch (error) {
    console.error("Certificate issue error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify a certificate
export const verifyCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findOne({ certificateId: id })
      .populate("userId", "name email")
      .populate("courseId", "courseTitle");

    if (!certificate) {
      return res.json({ success: false, message: "Certificate not found" });
    }

    res.json({ success: true, certificate });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user certificates
export const getUserCertificates = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const certificates = await Certificate.find({ userId })
      .populate("courseId", "courseTitle");

    res.json({ success: true, certificates });
  } catch (error) {
    console.error("Get certs error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
