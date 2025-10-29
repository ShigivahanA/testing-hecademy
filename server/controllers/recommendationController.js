import axios from "axios";
import User from "../models/User.js";
import Course from "../models/Course.js";

const PYTHON_API = process.env.RECOMMENDER_API_URL || "http://127.0.0.1:5001";

/* 🧹 Helper — recursively clean Mongo ObjectIDs / numeric wrappers */
function cleanMongoObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (obj.$oid) return obj.$oid;
  if (obj.$numberInt) return parseInt(obj.$numberInt);
  if (obj.$numberLong) return parseInt(obj.$numberLong);
  if (obj.$date && obj.$date.$numberLong)
    return new Date(parseInt(obj.$date.$numberLong));
  const cleaned = {};
  for (const key in obj) cleaned[key] = cleanMongoObject(obj[key]);
  return cleaned;
}

/* 🎯 Normalize topics & goals based on latest taxonomy */
function normalizePreferences(preferences) {
  const topicMap = {
    "web": "Web Development",
    "frontend": "Frontend Development",
    "backend": "Backend Development",
    "ai": "Artificial Intelligence",
    "ml": "Machine Learning",
    "cyber": "Cybersecurity",
    "security": "Network Security",
    "marketing": "Digital Marketing",
    "seo": "SEO",
    "social": "Social Media Marketing",
    "content": "Content Marketing",
    "design": "UI/UX Design",
    "figma": "Design Tools (Figma, Adobe XD)",
    "project": "Project Management",
    "entrepreneurship": "Entrepreneurship",
    "data": "Data Science",
  };

  const goalMap = {
    "career": "Career Growth",
    "job": "Job Readiness",
    "upskill": "Skill Upgrade / Upskilling",
    "freelance": "Freelancing",
    "portfolio": "Portfolio Building",
    "switch": "Switching Careers",
    "ai": "Specializing in AI / Data Science",
    "cyber": "Becoming Cybersecurity Expert",
    "design": "Becoming UI/UX Designer",
    "cloud": "Becoming Cloud Engineer",
    "fun": "Learning for Fun & Creativity"
  };

  const normalized = { topics: [], goals: [], difficulty: preferences.difficulty || "intermediate" };

  // normalize topics
  if (Array.isArray(preferences.topics)) {
    preferences.topics.forEach(t => {
      const key = t.toLowerCase().trim();
      const mapped = Object.keys(topicMap).find(k => key.includes(k));
      normalized.topics.push(mapped ? topicMap[mapped] : t);
    });
  }

  // normalize goals
  if (Array.isArray(preferences.goals)) {
    preferences.goals.forEach(g => {
      const key = g.toLowerCase().trim();
      const mapped = Object.keys(goalMap).find(k => key.includes(k));
      normalized.goals.push(mapped ? goalMap[mapped] : g);
    });
  }

  // remove duplicates & trim
  normalized.topics = [...new Set(normalized.topics.map(t => t.trim()))];
  normalized.goals = [...new Set(normalized.goals.map(g => g.trim()))];

  return normalized;
}

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.auth.userId;

    // ⚡ Always get fresh user data with courses
    const userDoc = await User.findOne({ _id: userId })
      .populate("enrolledCourses")
      .lean();

    if (!userDoc)
      return res.status(404).json({ success: false, message: "User not found" });

    console.log("🧠 Live User Preferences (fresh from DB):", userDoc.preferences);
    console.log("👤 Enrolled Courses:", userDoc.enrolledCourses?.length || 0);

    // 🧩 Preserve preferences BEFORE cleaning
    const preservedPreferences = {
      topics: Array.isArray(userDoc.preferences?.topics)
        ? [...userDoc.preferences.topics]
        : [],
      goals: Array.isArray(userDoc.preferences?.goals)
        ? [...userDoc.preferences.goals]
        : [],
      difficulty: userDoc.preferences?.difficulty || "",
    };

    // 🔧 Clean MongoDB formatting
    const user = cleanMongoObject(userDoc);
    const allCourses = await Course.find({ isPublished: true }).lean();
    const courses = allCourses.map((c) => cleanMongoObject(c));

    const enrolledCoursesArray = Array.isArray(user.enrolledCourses)
      ? user.enrolledCourses
      : user.enrolledCourses
      ? Object.values(user.enrolledCourses)
      : [];

    // ✅ Restore normalized preferences
    user.preferences = normalizePreferences(preservedPreferences);

    // ✅ Fill missing preferences
    if (!Array.isArray(user.preferences.topics) || user.preferences.topics.length === 0) {
      const topicPool = [];
      enrolledCoursesArray.forEach((course) => {
        if (course.tags?.length) topicPool.push(...course.tags);
        else if (course.courseTitle)
          topicPool.push(...course.courseTitle.split(" "));
      });
      user.preferences.topics = [...new Set(topicPool.map((t) => t.trim()))].slice(0, 5);
    }

    if (!Array.isArray(user.preferences.goals) || user.preferences.goals.length === 0) {
      user.preferences.goals = ["Career Growth", "Skill Upgrade / Upskilling"];
    }

    if (!user.preferences.difficulty) {
      user.preferences.difficulty = "intermediate";
    }

    // 🧩 Add fallback activity logs for new users
if (!user.activityLog?.length && enrolledCoursesArray?.length) {
  user.activityLog = enrolledCoursesArray.map((course) => ({
    action: "watched",
    courseId: course._id,
    details: {},
    timestamp: new Date(),
  }));
}

// 🧼 FIX: Ensure string IDs before sending to Python
for (const course of courses) {
  if (course._id && typeof course._id !== "string") {
    try {
      course._id = String(course._id);
    } catch {
      course._id = "";
    }
  }
}

if (user.activityLog?.length) {
  user.activityLog = user.activityLog.map((log) => ({
    ...log,
    courseId: log.courseId ? String(log.courseId) : "",
  }));
}

// 🔍 Deep log before Python call
console.log("🧩 Final Preferences Sent to Python:", user.preferences);
console.log("📚 Activity Count:", user.activityLog?.length || 0);

// 🚀 Send to Python recommender
const { data } = await axios.post(
  `${PYTHON_API}/recommend`,
  { user, courses },
  { timeout: 10000 }
);


    console.log(
      "📥 Recommender Response:",
      data?.success ? "✅ Success" : "❌ Fail",
      "| Returned:",
      data?.recommended?.length || 0,
      "courses"
    );

    // 🧾 LOG FULL RAW PYTHON RESPONSE (for debugging structure)
    console.log("🧾 Raw Python Response:", JSON.stringify(data, null, 2));

    // 🧼 Handle and clean recommender response
    if (data.success && Array.isArray(data.recommended) && data.recommended.length > 0) {
      const cleanedRecommendations = data.recommended
        .map((course, i) => {
          let cleanId = course._id;

          try {
            // ✅ Case 1: if it's already a valid string — keep it.
            if (typeof cleanId === "string" && cleanId.trim().length >= 12) {
              cleanId = cleanId.trim();
            }

            // ✅ Case 2: handle object-based or buffer IDs.
            else if (typeof cleanId === "object" && cleanId !== null) {
              if (cleanId.$oid) cleanId = cleanId.$oid;
              else if (cleanId._id?.$oid) cleanId = cleanId._id.$oid;
              else if (cleanId.buffer?.data)
                cleanId = Buffer.from(cleanId.buffer.data).toString("hex");
              else if (cleanId.courseId) cleanId = cleanId.courseId;
              else cleanId = "";
            }

            // ✅ Ensure it's a string now
            cleanId = String(cleanId || "").trim();

            // 🚫 Skip invalid or malformed IDs
            if (
              !cleanId ||
              cleanId.length < 10 ||
              cleanId.toLowerCase().includes("object") ||
              cleanId.toLowerCase().includes("none") ||
              cleanId.toLowerCase().includes("nan") ||
              cleanId === "{}"
            ) {
              console.warn(`⚠️ Skipping invalid course ID at index ${i}:`, cleanId);
              return null;
            }
          } catch (err) {
            console.warn(`⚠️ ID cleaning failed for course index ${i}:`, err.message);
            return null;
          }

          return { ...course, _id: cleanId };
        })
        .filter(Boolean);

      console.log(
        "🧼 Cleaned Recommendation IDs:",
        cleanedRecommendations.map((c) => c._id)
      );

      if (cleanedRecommendations.length === 0) {
        console.warn("⚠️ All recommended IDs invalid, fetching fallback...");
        const fallback = await Course.find({ isPublished: true })
          .sort({ rating: -1, createdAt: -1 })
          .limit(5)
          .lean();
        return res.json({
          success: true,
          recommended: fallback,
          message: "Fallback returned because all recommendations had invalid IDs.",
        });
      }

      return res.json({ success: true, recommended: cleanedRecommendations });
    }

    console.warn("⚠️ No personalized matches — returning fallback.");
    const fallback = await Course.find({ isPublished: true })
      .sort({ rating: -1, createdAt: -1 })
      .limit(5)
      .lean();

    return res.json({
      success: true,
      recommended: fallback,
      message:
        "No personalized matches found. Showing popular courses instead.",
    });
  } catch (err) {
    console.error("❌ Recommendation error:", err.message);
    const fallback = await Course.find({ isPublished: true })
      .sort({ rating: -1, createdAt: -1 })
      .limit(5)
      .lean();

    return res.json({
      success: false,
      recommended: fallback,
      message:
        "Recommender service unavailable. Showing top courses temporarily.",
    });
  }
};
