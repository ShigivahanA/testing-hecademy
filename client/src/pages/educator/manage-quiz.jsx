import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

const ManageQuiz = () => {
  const { backendUrl, getToken } = useContext(AppContext);
  const [tab, setTab] = useState("add");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    courseId: "",
    chapterId: "",
    title: "",
    passPercentage: 80,
    questionsText: "",
    optionsText: "",
    answersText: "",
  });

  // ✅ Fetch Courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const { data } = await axios.get(`${backendUrl}/api/educator/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) setCourses(data.courses);
      } catch (err) {
        toast.error("Failed to load courses");
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // ✅ Handle Quiz Creation
  const handleCreateQuiz = async () => {
    try {
      const course = courses.find((c) => c._id === form.courseId);
      if (!course) return toast.error("Please select a valid course");

      const chapter = course.courseContent.find(
        (ch) => ch.chapterId === form.chapterId
      );
      if (!chapter) return toast.error("Please select a valid chapter");

      const questionLines = form.questionsText
        .trim()
        .split(/\r?\n/)
        .filter(Boolean);
      const answerLines = form.answersText
        .trim()
        .split(/\r?\n/)
        .filter(Boolean);

      const groupedOptions = form.optionsText
        .split(/optionforquiz/i)
        .map((group) =>
          group
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
        )
        .filter((arr) => arr.length > 0);

      if (questionLines.length !== answerLines.length)
        return toast.error("Number of questions and answers mismatch");

      if (questionLines.length !== groupedOptions.length)
        toast.warn(
          `You entered ${questionLines.length} questions but ${groupedOptions.length} option groups. Make sure each question's options start with "optionforquiz".`
        );

      const questions = questionLines.map((q, i) => ({
        questionText: q.trim(),
        options: (groupedOptions[i] || []).map((opt) => ({
          text: opt.trim(),
          isCorrect: opt.trim() === answerLines[i]?.trim(),
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
        setForm({
          courseId: "",
          chapterId: "",
          title: "",
          passPercentage: 80,
          questionsText: "",
          optionsText: "",
          answersText: "",
        });
      } else toast.error(data.message || "Failed to create quiz");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto flex flex-col items-center md:p-8 p-4 bg-gray-50">
      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b w-full max-w-3xl">
        {["add", "manage"].map((t) => (
          <button
            key={t}
            className={`pb-2 font-semibold transition-all ${
              tab === t
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab(t)}
          >
            {t === "add" ? "➕ Add Quiz" : "🗂 Manage Quizzes"}
          </button>
        ))}
      </div>

      {/* Add Quiz Form */}
      {tab === "add" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateQuiz();
          }}
          className="flex flex-col gap-6 w-full max-w-3xl text-gray-700 bg-white border border-gray-200 shadow-md rounded-lg p-6 mb-12"
        >
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Create New Quiz
          </h2>

          {loading ? (
            <div className="flex justify-center items-center gap-2 text-gray-500 py-8">
              <Loader2 className="animate-spin" size={22} /> Loading Courses...
            </div>
          ) : (
            <>
              {/* Course Selector */}
              <div className="flex flex-col gap-1">
                <p className="font-medium">Select Course</p>
                <select
                  value={form.courseId}
                  onChange={(e) =>
                    setForm({ ...form, courseId: e.target.value, chapterId: "" })
                  }
                  className="outline-none border border-gray-400 rounded px-3 py-2"
                  required
                >
                  <option value="">Choose Course</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.courseTitle}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chapter Selector */}
              {form.courseId && (
                <div className="flex flex-col gap-1">
                  <p className="font-medium">Select Chapter</p>
                  <select
                    value={form.chapterId}
                    onChange={(e) =>
                      setForm({ ...form, chapterId: e.target.value })
                    }
                    className="outline-none border border-gray-400 rounded px-3 py-2"
                    required
                  >
                    <option value="">Choose Chapter</option>
                    {courses
                      .find((c) => c._id === form.courseId)
                      ?.courseContent.map((ch) => (
                        <option key={ch.chapterId} value={ch.chapterId}>
                          {ch.chapterTitle}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Quiz Title */}
              <div className="flex flex-col gap-1">
                <p className="font-medium">Quiz Title</p>
                <input
                  type="text"
                  placeholder="Enter Quiz Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="outline-none border border-gray-400 rounded px-3 py-2"
                  required
                />
              </div>

              {/* Questions Input */}
              <div className="flex flex-col gap-1">
                <p className="font-medium">Questions (one per line)</p>
                <textarea
                  placeholder="Enter each question on a new line"
                  value={form.questionsText}
                  onChange={(e) =>
                    setForm({ ...form, questionsText: e.target.value })
                  }
                  className="outline-none border border-gray-400 rounded px-3 py-2 h-28 resize-none"
                  required
                />
              </div>

              {/* Correct Answers */}
              <div className="flex flex-col gap-1">
                <p className="font-medium">Correct Answers (one per line)</p>
                <textarea
                  placeholder="Enter corresponding correct answers"
                  value={form.answersText}
                  onChange={(e) =>
                    setForm({ ...form, answersText: e.target.value })
                  }
                  className="outline-none border border-gray-400 rounded px-3 py-2 h-28 resize-none"
                  required
                />
              </div>

              {/* Options Input */}
              <div className="flex flex-col gap-1">
                <p className="font-medium">
                  Options (separate each group with <b>optionforquiz</b>)
                </p>
                <textarea
                  placeholder={`Example:\noptionforquiz\nA\nB\nC\nD\noptionforquiz\nTrue\nFalse`}
                  value={form.optionsText}
                  onChange={(e) =>
                    setForm({ ...form, optionsText: e.target.value })
                  }
                  className="outline-none border border-gray-400 rounded px-3 py-2 h-40 resize-none"
                  required
                />
              </div>

              {/* Pass Percentage */}
              <div className="flex flex-col gap-1 w-40">
                <p className="font-medium">Pass Percentage</p>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.passPercentage}
                  onChange={(e) =>
                    setForm({ ...form, passPercentage: e.target.value })
                  }
                  className="outline-none border border-gray-400 rounded px-3 py-2"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white w-max px-6 py-2.5 rounded-lg font-semibold mt-4 transition-all"
              >
                Create Quiz
              </button>
            </>
          )}
        </form>
      ) : (
        <div className="w-full max-w-4xl bg-white border border-gray-200 shadow-md rounded-lg p-6 text-center text-gray-600 mt-8">
          <p className="text-lg">Manage Quizzes Tab Coming Soon</p>
        </div>
      )}
    </div>
  );
};

export default ManageQuiz;
