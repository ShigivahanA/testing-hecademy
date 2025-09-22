import User from "../models/User.js";
import Course from "../models/Course.js";
import natural from "natural";  // TF-IDF (lightweight)

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findById(userId).populate("enrolledCourses");

    if (!user) return res.json({ success: false, message: "User not found" });

    // 1. Get all courses
    const allCourses = await Course.find({ isPublished: true });

    // 2. Build user keywords (preferences + enrolled course tags)
    let keywords = [
      ...(user.preferences?.topics || []),
      ...(user.preferences?.goals || []),
      user.preferences?.difficulty || ""
    ];
    user.enrolledCourses.forEach(c => {
      keywords.push(c.courseTitle, ...(c.tags || []));
    });

    // 3. TF-IDF similarity
    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();
    allCourses.forEach(c => {
      const docText = [
        c.courseTitle,
        c.courseDescription,
        ...(c.tags || []) // ✅ include tags
      ].join(" ");
      tfidf.addDocument(docText);
    });

    const scores = allCourses.map((c, idx) => ({
      course: c,
      score: tfidf.tfidf(keywords.join(" "), idx)
    }));

    // 4. Sort & filter out already enrolled
      const recommended = scores
        .filter(s => s.score > 0) // ✅ only real matches
        .filter(s => !user.enrolledCourses.map(ec => ec._id.toString()).includes(s.course._id.toString()))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(s => s.course);


    // If no matches found, send empty recommendations
    if (recommended.length === 0) {
      return res.json({ success: true, recommended: [] });
    }

    res.json({ success: true, recommended });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};
