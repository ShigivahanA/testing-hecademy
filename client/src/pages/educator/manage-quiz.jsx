// pages/educator/ManageQuiz.jsx
import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";

const ManageQuiz = () => {
  const { backendUrl, getToken } = useContext(AppContext);
  const [tab, setTab] = useState("add");
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    courseId: "",
    chapterId: "",
    title: "",
    passPercentage: 80,
    questionsText: "",
    optionsText: "",
    answersText: "",
  });
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/educator/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setCourses(data.courses);
    };
    fetchCourses();
  }, []);

  const handleCreateQuiz = async () => {
    try {
      const course = courses.find((c) => c._id === form.courseId);
      const chapter = course.courseContent.find(
        (ch) => ch.chapterId === form.chapterId
      );

      const questionLines = form.questionsText.split("\n").filter(Boolean);
      const answerLines = form.answersText.split("\n").filter(Boolean);
      const optionLines = form.optionsText.split("\n").filter(Boolean);

      if (questionLines.length !== answerLines.length) {
        return toast.error("Number of questions and answers mismatch");
      }

      const questions = questionLines.map((q, i) => ({
        questionText: q.trim(),
        options: optionLines.map((opt) => ({
          text: opt.trim(),
          isCorrect: opt.trim() === answerLines[i].trim(),
        })),
      }));

      const token = await getToken();
      const { data } = await axios.post(
  `${backendUrl}/api/quiz/create`,
  {
    courseId: form.courseId,
    chapterId: form.chapterId,
    title: form.title,
    passPercentage: form.passPercentage,
    questions,
  },
  { headers: { Authorization: `Bearer ${token}` } }
);

if (data.success) {
  toast.success("Quiz created successfully!");
} else {
  toast.error(data.message || "Failed to create quiz");
}
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b mb-6">
        <button
          className={`pb-2 ${tab === "add" ? "border-b-2 border-blue-600" : ""}`}
          onClick={() => setTab("add")}
        >
          Add Quiz
        </button>
        <button
          className={`pb-2 ${tab === "manage" ? "border-b-2 border-blue-600" : ""}`}
          onClick={() => setTab("manage")}
        >
          Manage Quizzes
        </button>
      </div>

      {tab === "add" ? (
        <div className="space-y-4">
          <select
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            className="border p-2 rounded w-full"
          >
            <option value="">Select Course</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.courseTitle}
              </option>
            ))}
          </select>

          {form.courseId && (
            <select
              value={form.chapterId}
              onChange={(e) => setForm({ ...form, chapterId: e.target.value })}
              className="border p-2 rounded w-full"
            >
              <option value="">Select Chapter</option>
              {courses
                .find((c) => c._id === form.courseId)
                ?.courseContent.map((ch) => (
                  <option key={ch.chapterId} value={ch.chapterId}>
                    {ch.chapterTitle}
                  </option>
                ))}
            </select>
          )}

          <input
            type="text"
            placeholder="Quiz Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="border p-2 rounded w-full"
          />

          <textarea
            placeholder="Enter Questions (one per line)"
            value={form.questionsText}
            onChange={(e) => setForm({ ...form, questionsText: e.target.value })}
            className="border p-2 rounded w-full h-24"
          />

          <textarea
            placeholder="Enter Correct Answers (one per line)"
            value={form.answersText}
            onChange={(e) => setForm({ ...form, answersText: e.target.value })}
            className="border p-2 rounded w-full h-24"
          />

          <textarea
            placeholder="Enter Options (each line will be an option)"
            value={form.optionsText}
            onChange={(e) => setForm({ ...form, optionsText: e.target.value })}
            className="border p-2 rounded w-full h-24"
          />

          <input
            type="number"
            placeholder="Pass Percentage"
            value={form.passPercentage}
            onChange={(e) =>
              setForm({ ...form, passPercentage: e.target.value })
            }
            className="border p-2 rounded w-full"
          />

          <button
            onClick={handleCreateQuiz}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Create Quiz
          </button>
        </div>
      ) : (
        <p>Manage Quizzes Tab Coming Soon</p>
      )}
    </div>
  );
};

export default ManageQuiz;
