import express from "express";
import axios from "axios";

const tutorRouter = express.Router();

tutorRouter.post("/ask", async (req, res) => {
  try {
    const { question, user } = req.body;

    // Fetch limited course data (for now all published courses)
    const courses = await req.db.Course.find(
      { isPublished: true },
      "courseTitle courseDescription tags difficulty courseContent"
    ).lean();

    // Send to your Python AI Tutor microservice
    const { data } = await axios.post(
      process.env.AITUTOR_API_URL + "/ask",
      { question, user, courses },
      {
        headers: {
          "x-api-key": process.env.AITUTOR_API_KEY,
        },
      }
    );

    res.json(data);
  } catch (err) {
    console.error("AI Tutor Error:", err.message);
    res.status(500).json({
      success: false,
      message: "AI Tutor unavailable. Please try again later.",
    });
  }
});

export default tutorRouter;
