import { v2 as cloudinary } from 'cloudinary'
import Course from '../models/Course.js';
import { Purchase } from '../models/Purchase.js';
import User from '../models/User.js';
import { clerkClient } from '@clerk/express'
import Sentiment from "sentiment";

const sentiment = new Sentiment();

// update role to educator
export const updateRoleToEducator = async (req, res) => {

    try {

        const userId = req.auth.userId

        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                role: 'educator',
            },
        })

        res.json({ success: true, message: 'You can publish a course now' })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

// Add New Course
export const addCourse = async (req, res) => {

    try {

        const { courseData } = req.body

        const imageFile = req.file

        const educatorId = req.auth.userId

        if (!imageFile) {
            return res.json({ success: false, message: 'Thumbnail Not Attached' })
        }

        const parsedCourseData = await JSON.parse(courseData)

        parsedCourseData.educator = educatorId

        const newCourse = await Course.create(parsedCourseData)

        const imageUpload = await cloudinary.uploader.upload(imageFile.path)

        newCourse.courseThumbnail = imageUpload.secure_url

        await newCourse.save()

        res.json({ success: true, message: 'Course Added' })

    } catch (error) {

        res.json({ success: false, message: error.message })

    }
}

// Get Educator Courses
export const getEducatorCourses = async (req, res) => {
    try {

        const educator = req.auth.userId

        const courses = await Course.find({ educator })

        res.json({ success: true, courses })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Educator Dashboard Data ( Total Earning, Enrolled Students, No. of Courses)
export const educatorDashboardData = async (req, res) => {
    try {
        const educator = req.auth.userId;

        const courses = await Course.find({ educator });

        const totalCourses = courses.length;

        const courseIds = courses.map(course => course._id);

        // Calculate total earnings from purchases
        const purchases = await Purchase.find({
            courseId: { $in: courseIds },
            status: 'completed'
        });

        const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

        // Collect unique enrolled student IDs with their course titles
        const enrolledStudentsData = [];
        for (const course of courses) {
            const students = await User.find({
                _id: { $in: course.enrolledStudents }
            }, 'name imageUrl');

            students.forEach(student => {
                enrolledStudentsData.push({
                    courseTitle: course.courseTitle,
                    student
                });
            });
        }

        res.json({
            success: true,
            dashboardData: {
                totalEarnings,
                enrolledStudentsData,
                totalCourses
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get Enrolled Students Data with Purchase Data
export const getEnrolledStudentsData = async (req, res) => {
    try {
        const educator = req.auth.userId;

        // Fetch all courses created by the educator
        const courses = await Course.find({ educator });

        // Get the list of course IDs
        const courseIds = courses.map(course => course._id);

        // Fetch purchases with user and course data
        const purchases = await Purchase.find({
            courseId: { $in: courseIds },
            status: 'completed'
        }).populate('userId', 'name imageUrl').populate('courseId', 'courseTitle');

        // enrolled students data
        const enrolledStudents = purchases.map(purchase => ({
            student: purchase.userId,
            courseTitle: purchase.courseId.courseTitle,
            purchaseDate: purchase.createdAt
        }));

        res.json({
            success: true,
            enrolledStudents
        });

    } catch (error) {
        res.json({
            success: false,
            message: error.message
        });
    }
};

export const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { courseData } = req.body;
    const educatorId = req.auth.userId;

    const parsedData = JSON.parse(courseData);

    // Find course and ensure educator owns it
    const course = await Course.findById(courseId);
    if (!course)
      return res.json({ success: false, message: "Course not found" });

    if (course.educator !== educatorId)
      return res.json({ success: false, message: "Unauthorized Access" });

    // Handle thumbnail update if new image provided
    if (req.file) {
      const uploadRes = await cloudinary.uploader.upload(req.file.path);
      parsedData.courseThumbnail = uploadRes.secure_url;
    }

    // Update fields
    Object.assign(course, parsedData);
    await course.save();

    res.json({ success: true, message: "Course updated successfully", course });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// 👁️ Toggle Course Visibility (Publish / Unpublish)
export const toggleCourseVisibility = async (req, res) => {
  try {
    const { courseId } = req.params;
    const educatorId = req.auth.userId;

    const course = await Course.findById(courseId);
    if (!course)
      return res.json({ success: false, message: "Course not found" });

    if (course.educator !== educatorId)
      return res.json({ success: false, message: "Unauthorized Access" });

    course.isPublished = !course.isPublished;
    await course.save();

    res.json({
      success: true,
      message: `Course ${
        course.isPublished ? "published" : "unpublished"
      } successfully`,
      isPublished: course.isPublished,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const analyzeFeedbackSentiment = async (req, res) => {
  try {
    const educatorId = req.auth.userId;

    // Find educator's courses
    const courses = await Course.find({ educator: educatorId })
      .select("courseTitle courseRatings")
      .lean();

    if (!courses.length) {
      return res.json({ success: true, sentimentStats: [] });
    }

    // Process each course’s feedback
    const sentimentStats = courses.map(course => {
      let total = 0,
        count = 0,
        positive = 0,
        neutral = 0,
        negative = 0;

      course.courseRatings.forEach(r => {
        if (r.feedback && r.feedback.trim()) {
          const result = sentiment.analyze(r.feedback);
          total += result.score;
          count++;

          if (result.score > 1) positive++;
          else if (result.score < -1) negative++;
          else neutral++;
        }
      });

      const avg = count ? total / count : 0;

      return {
        courseTitle: course.courseTitle,
        positive,
        neutral,
        negative,
        avgSentiment: avg,
        satisfaction:
          avg > 1 ? "Positive" : avg < -1 ? "Negative" : "Neutral",
      };
    });

    res.json({ success: true, sentimentStats });
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};