import express from 'express'
import { addCourse, educatorDashboardData, getEducatorCourses, getEnrolledStudentsData, updateRoleToEducator, toggleCourseVisibility,updateCourse,analyzeFeedbackSentiment,getCoursesByEducator } from '../controllers/educatorController.js';
import upload from '../configs/multer.js';
import { protectEducator } from '../middlewares/authMiddleware.js';


const educatorRouter = express.Router()

// Add Educator Role 
educatorRouter.get('/update-role', updateRoleToEducator)

// Add Courses 
educatorRouter.post('/add-course', upload.single('image'), protectEducator, addCourse)

// Get Educator Courses 
educatorRouter.get('/courses', protectEducator, getEducatorCourses)

// Get Educator Dashboard Data
educatorRouter.get('/dashboard', protectEducator, educatorDashboardData)

// Get Educator Students Data
educatorRouter.get('/enrolled-students', protectEducator, getEnrolledStudentsData)

// Update Existing Course (Edit details, chapters, thumbnail)
educatorRouter.put(
  "/update-course/:courseId",
  upload.single("image"),
  protectEducator,
  updateCourse
);

// Toggle Course Visibility (Publish/Unpublish)
educatorRouter.patch(
  "/toggle-visibility/:courseId",
  protectEducator,
  toggleCourseVisibility
);

educatorRouter.get("/feedback-sentiment", protectEducator, analyzeFeedbackSentiment);

educatorRouter.get("/:id/courses", getCoursesByEducator);


export default educatorRouter;