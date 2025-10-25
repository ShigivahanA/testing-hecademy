import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import { Loader2, Trash2, Edit3, ChevronDown, Save, XCircle } from "lucide-react";

const ManageQuiz = () => {
  const { backendUrl, getToken } = useContext(AppContext);
  const [tab, setTab] = useState("add");
  const [courses, setCourses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);

  const [form, setForm] = useState({
    courseId: "",
    chapterId: "",
    title: "",
    passPercentage: 80,
    questionsText: "",
    optionsText: "",
    answersText: "",
  });

  // ==================================================
  // 🔹 Fetch Courses (for Add Tab)
  // ==================================================
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

  // ==================================================
  // 🔹 Fetch Quizzes (for Manage Tab)
  // ==================================================
  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/quiz/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setQuizzes(data.quizzes);
    } catch (err) {
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "manage") fetchQuizzes();
  }, [tab]);

  // ==================================================
  // 🔹 Create Quiz
  // ==================================================
  const handleCreateQuiz = async () => {
    try {
      const course = courses.find((c) => c._id === form.courseId);
      if (!course) return toast.error("Please select a valid course");

      const chapter = course.courseContent.find(
        (ch) => ch.chapterId === form.chapterId
      );
      if (!chapter) return toast.error("Please select a valid chapter");

      const questionLines = form.questionsText.trim().split(/\r?\n/).filter(Boolean);
      const answerLines = form.answersText.trim().split(/\r?\n/).filter(Boolean);

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

  // ==================================================
  // 🔹 Delete Quiz
  // ==================================================
  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return;
    try {
      const token = await getToken();
      const { data } = await axios.delete(`${backendUrl}/api/quiz/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        toast.success("Quiz deleted successfully!");
        setQuizzes((prev) => prev.filter((q) => q._id !== quizId));
      } else toast.error("Failed to delete quiz");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ==================================================
  // 🔹 Edit Quiz
  // ==================================================
  const handleEditQuiz = (quiz) => {
    setEditingQuiz(quiz);
  };

  const handleSaveEdit = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.put(
        `${backendUrl}/api/quiz/${editingQuiz._id}`,
        editingQuiz,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("Quiz updated successfully!");
        setEditingQuiz(null);
        fetchQuizzes();
      } else toast.error(data.message || "Failed to update quiz");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ==================================================
  // 🔹 UI Rendering
  // ==================================================
  return (
    <div className="min-h-screen overflow-y-auto flex flex-col items-center md:p-8 p-4 bg-gray-50">
      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b w-full max-w-4xl">
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
            {t === "add" ? "+ Add Quiz" : "🧩 Manage Quizzes"}
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
          className="flex flex-col gap-6 w-full max-w-3xl text-gray-700 p-6 mb-12"
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
        <div className="w-full max-w-5xl">
          {loading ? (
            <div className="flex justify-center items-center gap-2 text-gray-500 py-10">
              <Loader2 className="animate-spin" size={22} /> Loading Quizzes...
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-lg">
              No quizzes found yet.
            </div>
          ) : (
            quizzes.map((quiz, idx) => (
              <div
                key={quiz._id}
                className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {idx + 1}. {quiz.title}
                  </h3>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEditQuiz(quiz)}
                      className="text-blue-600 hover:text-blue-800 transition"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteQuiz(quiz._id)}
                      className="text-red-600 hover:text-red-800 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mb-3">
                  Pass Percentage: {quiz.passPercentage}%
                </p>

                <details className="border-t border-gray-100 pt-2">
                  <summary className="text-blue-600 text-sm font-medium cursor-pointer flex items-center gap-1">
                    View Questions <ChevronDown size={14} />
                  </summary>
                  <ul className="mt-3 space-y-2 text-gray-700 text-sm">
                    {quiz.questions.map((q, i) => (
                      <li key={i}>
                        <b>Q{i + 1}:</b> {q.questionText}
                        <ul className="pl-4 mt-1">
                          {q.options.map((opt, j) => (
                            <li
                              key={j}
                              className={
                                opt.isCorrect
                                  ? "text-green-600 font-medium"
                                  : "text-gray-600"
                              }
                            >
                              - {opt.text}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingQuiz && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Edit Quiz
            </h2>
            <label className="block mb-2 text-sm font-medium">
              Title:
              <input
                type="text"
                value={editingQuiz.title}
                onChange={(e) =>
                  setEditingQuiz({ ...editingQuiz, title: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-3 py-2 mt-1"
              />
            </label>
            <label className="block mb-2 text-sm font-medium">
              Pass Percentage:
              <input
                type="number"
                min="1"
                max="100"
                value={editingQuiz.passPercentage}
                onChange={(e) =>
                  setEditingQuiz({
                    ...editingQuiz,
                    passPercentage: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded px-3 py-2 mt-1"
              />
            </label>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditingQuiz(null)}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
              >
                <XCircle size={18} /> Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Save size={18} /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageQuiz;
