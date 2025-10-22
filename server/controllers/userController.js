import Course from "../models/Course.js"
import { CourseProgress } from "../models/CourseProgress.js"
import { Purchase } from "../models/Purchase.js"
import User from "../models/User.js"
import stripe from "stripe"



// Get User Data
export const getUserData = async (req, res) => {
    try {

        const userId = req.auth.userId

        const user = await User.findById(userId)

        if (!user) {
            return res.json({ success: false, message: 'User Not Found' })
        }

        res.json({ success: true, user })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Purchase Course 
export const purchaseCourse = async (req, res) => {

    try {

        const { courseId } = req.body
        const { origin } = req.headers


        const userId = req.auth.userId

        const courseData = await Course.findById(courseId)
        const userData = await User.findById(userId)

        if (!userData || !courseData) {
            return res.json({ success: false, message: 'Data Not Found' })
        }

        const purchaseData = {
            courseId: courseData._id,
            userId,
            amount: (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2),
        }

        const newPurchase = await Purchase.create(purchaseData)

        // Stripe Gateway Initialize
        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)

        const currency = process.env.CURRENCY.toLocaleLowerCase()

        // Creating line items to for Stripe
        const line_items = [{
            price_data: {
                currency,
                product_data: {
                    name: courseData.courseTitle
                },
                unit_amount: Math.floor(newPurchase.amount) * 100
            },
            quantity: 1
        }]

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/loading/my-enrollments`,
            cancel_url: `${origin}/`,
            line_items: line_items,
            mode: 'payment',
            metadata: {
                purchaseId: newPurchase._id.toString()
            }
        })

        res.json({ success: true, session_url: session.url });


    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Users Enrolled Courses With Lecture Links
export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = req.auth.userId;

    // Get user + enrolled courses
    const userData = await User.findById(userId).populate("enrolledCourses");

    // Get all purchases by this user
    const purchases = await Purchase.find({ userId }).populate("courseId");

    // Separate completed + pending
    const completedCourseIds = purchases
      .filter((p) => p.status === "completed")
      .map((p) => p.courseId._id.toString());

    // Pending only if not completed
    const pendingCourses = purchases
      .filter(
        (p) =>
          p.status === "pending" &&
          !completedCourseIds.includes(p.courseId._id.toString())
      )
      .map((p) => ({
        _id: p.courseId._id,
        courseTitle: p.courseId.courseTitle,
        courseThumbnail: p.courseId.courseThumbnail,
        status: p.status,
      }));

    res.json({
      success: true,
      enrolledCourses: userData.enrolledCourses,
      pendingCourses,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};


// Update User Course Progress
export const updateUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId, lectureId, duration } = req.body; // ✅ include duration

    if (!courseId || !lectureId) {
      return res.json({ success: false, message: "Missing required fields" });
    }
    const pointsPerMinute = 2;
    const earnedScore = Math.round((duration || 0) * pointsPerMinute);    
    
    let progressData = await CourseProgress.findOne({ userId, courseId });

    if (progressData) {
      const alreadyDone = progressData.lectureCompleted.some(
        (lec) => lec.lectureId === lectureId
      );

      if (alreadyDone) {
        return res.json({ success: true, message: "Lecture already completed" });
      }

      // ✅ Store metadata
      progressData.lectureCompleted.push({
        lectureId,
        duration: duration || 0,
        completedAt: new Date(),
        score: earnedScore,
      });
      progressData.totalScore += earnedScore;

      // Check if all lectures are done
      // You can compare count later if course.totalLectures known
      await progressData.save();
    } else {
      progressData = await CourseProgress.create({
        userId,
        courseId,
        totalScore: earnedScore,
        lectureCompleted: [
          {
            lectureId,
            duration: duration || 0,
            completedAt: new Date(),
            score: earnedScore,
          },
        ],
      });
    }

    await User.findByIdAndUpdate(userId, { $inc: { totalScore: earnedScore } });
    recalculateLeaderboardScores();
    res.json({ success: true, message: `Progress updated +${earnedScore} points`, progressData });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};


// get User Course Progress
export const getUserCourseProgress = async (req, res) => {

    try {

        const userId = req.auth.userId

        const { courseId } = req.body

        const progressData = await CourseProgress.findOne({ userId, courseId })

        res.json({ success: true, progressData })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

// Add User Ratings to Course
export const addUserRating = async (req, res) => {

    const userId = req.auth.userId;
    const { courseId, rating } = req.body;

    // Validate inputs
    if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
        return res.json({ success: false, message: 'InValid Details' });
    }

    try {
        // Find the course by ID
        const course = await Course.findById(courseId);

        if (!course) {
            return res.json({ success: false, message: 'Course not found.' });
        }

        const user = await User.findById(userId);

        if (!user || !user.enrolledCourses.includes(courseId)) {
            return res.json({ success: false, message: 'User has not purchased this course.' });
        }

        // Check is user already rated
        const existingRatingIndex = course.courseRatings.findIndex(r => r.userId === userId);

        if (existingRatingIndex > -1) {
            // Update the existing rating
            course.courseRatings[existingRatingIndex].rating = rating;
        } else {
            // Add a new rating
            course.courseRatings.push({ userId, rating });
        }

        await course.save();

        return res.json({ success: true, message: 'Rating added' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const updateUserPreferences = async (req, res) => {
  try {
    // Clerk injects user info via middleware
    const userId = req.auth?.userId
    if (!userId) {
      return res.json({ success: false, message: "Unauthorized" })
    }

    const { topics, difficulty, goals } = req.body

    // Validate
    if (!topics?.length && !difficulty && !goals?.length) {
      return res.json({ success: false, message: "No preferences provided" })
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { preferences: { topics, difficulty, goals } },
      { new: true }
    )

    if (!user) {
      return res.json({ success: false, message: "User not found" })
    }

    res.json({ success: true, message: "Preferences updated", user })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// Get Leaderboard (Top Learners - Dynamic Recalculation)
export const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Step 1️⃣: Fetch all users (excluding educators)
    const users = await User.find(
      { "publicMetadata.role": { $ne: "educator" } },
      "_id name imageUrl"
    );

    // Step 2️⃣: For each user, calculate total score from CourseProgress
    const leaderboard = await Promise.all(
      users.map(async (user) => {
        const progresses = await CourseProgress.find({ userId: user._id });
        const totalScore = progresses.reduce(
          (sum, p) => sum + (p.totalScore || 0),
          0
        );
        return {
          userId: user._id,
          name: user.name,
          imageUrl: user.imageUrl,
          totalScore,
        };
      })
    );

    // Step 3️⃣: Sort + limit top users
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    const topUsers = leaderboard.slice(0, limit);

    res.json({ success: true, leaderboard: topUsers });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
