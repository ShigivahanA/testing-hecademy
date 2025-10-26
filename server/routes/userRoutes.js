import express from 'express'
import { addUserRating, getUserCourseProgress, getUserData, purchaseCourse, updateUserCourseProgress, userEnrolledCourses, updateUserPreferences,getLeaderboard, addFeedback, checkFeedbackStatus, getUsersByIds } from '../controllers/userController.js';


const userRouter = express.Router()

// Get user Data
userRouter.get('/data', getUserData)
userRouter.post('/purchase', purchaseCourse)
userRouter.get('/enrolled-courses', userEnrolledCourses)
userRouter.post('/update-course-progress', updateUserCourseProgress)
userRouter.post('/get-course-progress', getUserCourseProgress)
userRouter.post('/add-rating', addUserRating)
userRouter.put("/preferences", updateUserPreferences)
userRouter.get("/leaderboard", getLeaderboard);
userRouter.post("/feedback", addFeedback);
userRouter.get("/check-feedback/:courseId",checkFeedbackStatus);
userRouter.post("/get-users-by-ids", getUsersByIds);



export default userRouter;