// src/pages/educator/ManageQuiz.jsx
import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import {
  Loader2,
  Trash2,
  Edit3,
  Save,
  X,
  Plus,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

const ManageQuiz = () => {
  const { backendUrl, getToken } = useContext(AppContext);
  const [tab, setTab] = useState("add");

  // Add tab
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [form, setForm] = useState({
    courseId: "",
    chapterId: "",
    title: "",
    passPercentage: 80,
    questionsText: "",
    optionsText: "",
    answersText: "",
  });

  // Manage tab
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [savingQuizId, setSavingQuizId] = useState(null);

  // Fetch courses for Add tab
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const token = await getToken();
        const { data } = await axios.get(`${backendUrl}/api/educator/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) setCourses(data.courses);
      } catch {
        toast.error("Failed to load courses");
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // Fetch quizzes for Manage tab
  const fetchQuizzes = async () => {
    try {
      setLoadingQuizzes(true);
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/quiz/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        // Ensure options each have id strings for React keys
        const normalized = data.quizzes.map(q => ({
          ...q,
          questions: q.questions.map(qq => ({
            ...qq,
            _id: qq._id?.toString() || crypto.randomUUID(),
            options: qq.options.map(op => ({
              ...op,
              _id: op._id?.toString() || crypto.randomUUID(),
            })),
          })),
        }));
        setQuizzes(normalized);
      }
    } catch {
      toast.error("Failed to load quizzes");
    } finally {
      setLoadingQuizzes(false);
    }
  };

  useEffect(() => {
    if (tab === "manage") fetchQuizzes();
  }, [tab]);

  // ---------------------------
  // Add quiz handlers
  // ---------------------------
  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    try {
      const course = courses.find((c) => c._id === form.courseId);
      if (!course) return toast.error("Select a valid course");

      const chapter = course.courseContent.find(
        (ch) => ch.chapterId === form.chapterId
      );
      if (!chapter) return toast.error("Select a valid chapter");

      const qs = form.questionsText.trim().split(/\r?\n/).filter(Boolean);
      const ans = form.answersText.trim().split(/\r?\n/).filter(Boolean);

      const groupedOptions = form.optionsText
        .split(/optionforquiz/i)
        .map((block) =>
          block.trim().split(/\r?\n/).filter(Boolean)
        )
        .filter((arr) => arr.length > 0);

      if (qs.length !== ans.length) {
        return toast.error("Number of questions and answers mismatch");
      }

      const questions = qs.map((q, i) => {
        const opts = (groupedOptions[i] || []).map((op) => ({
          text: op.trim(),
          isCorrect: op.trim() === ans[i]?.trim(),
        }));
        if (!opts.some(o => o.isCorrect)) {
          // default first one correct if author forgot (prevents server validation failure)
          if (opts.length) opts[0].isCorrect = true;
        }
        return { questionText: q.trim(), options: opts };
      });

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
        toast.success("Quiz created");
        setForm({
          courseId: "",
          chapterId: "",
          title: "",
          passPercentage: 80,
          questionsText: "",
          optionsText: "",
          answersText: "",
        });
        if (tab === "manage") fetchQuizzes();
      } else {
        toast.error(data.message || "Failed to create quiz");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ---------------------------
  // Manage: local edit helpers
  // ---------------------------
  const replaceQuizInState = (quizId, updater) => {
    setQuizzes((prev) =>
      prev.map((q) => (q._id === quizId ? updater({ ...q }) : q))
    );
  };

  const updateQuizField = (quizId, field, value) => {
    replaceQuizInState(quizId, (q) => {
      q[field] = value;
      return q;
    });
  };

  const addQuestion = (quizId) => {
    replaceQuizInState(quizId, (q) => {
      q.questions.push({
        _id: crypto.randomUUID(),
        questionText: "",
        options: [
          { _id: crypto.randomUUID(), text: "", isCorrect: true },
          { _id: crypto.randomUUID(), text: "", isCorrect: false },
        ],
      });
      return q;
    });
  };

  const removeQuestion = (quizId, questionId) => {
    replaceQuizInState(quizId, (q) => {
      q.questions = q.questions.filter((qq) => qq._id !== questionId);
      return q;
    });
  };

  const updateQuestionText = (quizId, questionId, value) => {
    replaceQuizInState(quizId, (q) => {
      q.questions = q.questions.map((qq) =>
        qq._id === questionId ? { ...qq, questionText: value } : qq
      );
      return q;
    });
  };

  const addOption = (quizId, questionId) => {
    replaceQuizInState(quizId, (q) => {
      q.questions = q.questions.map((qq) => {
        if (qq._id !== questionId) return qq;
        return {
          ...qq,
          options: [...qq.options, { _id: crypto.randomUUID(), text: "", isCorrect: false }],
        };
      });
      return q;
    });
  };

  const removeOption = (quizId, questionId, optionId) => {
    replaceQuizInState(quizId, (q) => {
      q.questions = q.questions.map((qq) => {
        if (qq._id !== questionId) return qq;
        const filtered = qq.options.filter((op) => op._id !== optionId);
        // Ensure at least one option remains & has a correct one
        if (filtered.length && !filtered.some(op => op.isCorrect)) {
          filtered[0].isCorrect = true;
        }
        return { ...qq, options: filtered };
      });
      return q;
    });
  };

  const updateOptionText = (quizId, questionId, optionId, value) => {
    replaceQuizInState(quizId, (q) => {
      q.questions = q.questions.map((qq) => {
        if (qq._id !== questionId) return qq;
        return {
          ...qq,
          options: qq.options.map((op) =>
            op._id === optionId ? { ...op, text: value } : op
          ),
        };
      });
      return q;
    });
  };

  const setCorrectOption = (quizId, questionId, optionId) => {
    replaceQuizInState(quizId, (q) => {
      q.questions = q.questions.map((qq) => {
        if (qq._id !== questionId) return qq;
        return {
          ...qq,
          options: qq.options.map((op) => ({
            ...op,
            isCorrect: op._id === optionId,
          })),
        };
      });
      return q;
    });
  };

  // ---------------------------
  // Save / Delete
  // ---------------------------
  const saveQuiz = async (quiz) => {
    try {
      setSavingQuizId(quiz._id);
      // Basic frontend validation
      if (!quiz.title?.trim()) return toast.error("Title required");
      if (!quiz.questions?.length) return toast.error("At least one question required");
      for (const q of quiz.questions) {
        if (!q.questionText?.trim()) return toast.error("Question text required");
        if (!q.options?.length) return toast.error("Each question needs options");
        if (!q.options.some((o) => o.isCorrect))
          return toast.error("Each question must have a correct option");
      }

      // Prepare payload for API (strip local _id for options/questions)
      const payload = {
        title: quiz.title,
        passPercentage: Number(quiz.passPercentage),
        chapterId: quiz.chapterId, // allow changing if you render a chapter selector later
        questions: quiz.questions.map((q) => ({
          questionText: q.questionText,
          options: q.options.map((o) => ({
            text: o.text,
            isCorrect: !!o.isCorrect,
          })),
        })),
      };

      const token = await getToken();
      const { data } = await axios.put(
        `${backendUrl}/api/quiz/${quiz._id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success("Quiz saved");
        // Re-fetch so we get normalized ids from DB
        await fetchQuizzes();
      } else {
        toast.error(data.message || "Failed to save quiz");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingQuizId(null);
    }
  };

  const deleteQuiz = async (quizId) => {
    if (!window.confirm("Delete this quiz?")) return;
    try {
      const token = await getToken();
      const { data } = await axios.delete(`${backendUrl}/api/quiz/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        toast.success("Quiz deleted");
        setQuizzes((prev) => prev.filter((q) => q._id !== quizId));
      } else {
        toast.error(data.message || "Failed to delete quiz");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="min-h-screen overflow-y-auto flex flex-col items-center md:p-8 p-4 bg-gray-50">
      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b w-full max-w-6xl">
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

      {tab === "add" ? (
        <form onSubmit={handleCreateQuiz} className="flex flex-col gap-6 w-full max-w-3xl text-gray-700 p-6 mb-12 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Create New Quiz</h2>

          {loadingCourses ? (
            <div className="flex justify-center items-center gap-2 text-gray-500 py-8">
              <Loader2 className="animate-spin" size={22} /> Loading Courses...
            </div>
          ) : (
            <>
              {/* Course */}
              <div className="flex flex-col gap-1">
                <p className="font-medium">Select Course</p>
                <select
                  value={form.courseId}
                  onChange={(e) =>
                    setForm({ ...form, courseId: e.target.value, chapterId: "" })
                  }
                  className="outline-none border border-gray-300 rounded px-3 py-2"
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

              {/* Chapter */}
              {form.courseId && (
                <div className="flex flex-col gap-1">
                  <p className="font-medium">Select Chapter</p>
                  <select
                    value={form.chapterId}
                    onChange={(e) =>
                      setForm({ ...form, chapterId: e.target.value })
                    }
                    className="outline-none border border-gray-300 rounded px-3 py-2"
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

              {/* Title & Pass % */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <p className="font-medium">Quiz Title</p>
                  <input
                    type="text"
                    placeholder="Enter Quiz Title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full outline-none border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <p className="font-medium">Pass %</p>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.passPercentage}
                    onChange={(e) =>
                      setForm({ ...form, passPercentage: e.target.value })
                    }
                    className="w-full outline-none border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
              </div>

              {/* Questions/Answers/Options bulk input */}
              <div className="flex flex-col gap-1">
                <p className="font-medium">Questions (one per line)</p>
                <textarea
                  placeholder="Enter each question on a new line"
                  value={form.questionsText}
                  onChange={(e) =>
                    setForm({ ...form, questionsText: e.target.value })
                  }
                  className="outline-none border border-gray-300 rounded px-3 py-2 h-28 resize-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <p className="font-medium">Correct Answers (one per line)</p>
                <textarea
                  placeholder="Enter corresponding correct answers"
                  value={form.answersText}
                  onChange={(e) =>
                    setForm({ ...form, answersText: e.target.value })
                  }
                  className="outline-none border border-gray-300 rounded px-3 py-2 h-28 resize-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <p className="font-medium">
                  Options (separate each question group with <b>optionforquiz</b>)
                </p>
                <textarea
                  placeholder={`Example:\noptionforquiz\nA\nB\nC\nD\noptionforquiz\nTrue\nFalse`}
                  value={form.optionsText}
                  onChange={(e) =>
                    setForm({ ...form, optionsText: e.target.value })
                  }
                  className="outline-none border border-gray-300 rounded px-3 py-2 h-40 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white w-max px-6 py-2.5 rounded-lg font-semibold mt-2 transition-all"
              >
                Create Quiz
              </button>
            </>
          )}
        </form>
      ) : (
        <div className="w-full max-w-6xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-800">Your Quizzes</h2>
            <button
              onClick={fetchQuizzes}
              className="flex items-center gap-2 text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          {loadingQuizzes ? (
            <div className="flex justify-center items-center gap-2 text-gray-500 py-10">
              <Loader2 className="animate-spin" size={22} /> Loading Quizzes...
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-lg">
              No quizzes found yet.
            </div>
          ) : (
            quizzes.map((quiz, qi) => (
              <div key={quiz._id} className="bg-white border border-gray-200 rounded-lg p-5 mb-6 shadow-sm">
                {/* Header / Meta */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">
                      {quiz?.courseId?.courseTitle || "Course"}
                    </div>
                    <input
                      className="w-full text-lg font-semibold text-gray-800 border-b border-transparent focus:border-blue-300 outline-none"
                      value={quiz.title}
                      onChange={(e) => updateQuizField(quiz._id, "title", e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-600">Pass %</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={quiz.passPercentage}
                        onChange={(e) =>
                          updateQuizField(quiz._id, "passPercentage", e.target.value)
                        }
                        className="w-20 px-2 py-1 border rounded"
                      />
                    </div>

                    <button
                      onClick={() => saveQuiz(quiz)}
                      disabled={savingQuizId === quiz._id}
                      className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-60"
                    >
                      {savingQuizId === quiz._id ? (
                        <>
                          <Loader2 className="animate-spin" size={16} /> Saving
                        </>
                      ) : (
                        <>
                          <Save size={16} /> Save
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => deleteQuiz(quiz._id)}
                      className="flex items-center gap-2 text-red-600 px-3 py-1.5 rounded hover:bg-red-50"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>

                {/* Questions */}
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-800">Questions</h4>
                    <button
                      onClick={() => addQuestion(quiz._id)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Plus size={16} /> Add Question
                    </button>
                  </div>

                  {quiz.questions.map((q) => (
                    <div key={q._id} className="mt-3 border border-gray-200 rounded-md p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <input
                            className="w-full font-medium border-b border-transparent focus:border-blue-300 outline-none text-gray-800"
                            placeholder="Question text"
                            value={q.questionText}
                            onChange={(e) =>
                              updateQuestionText(quiz._id, q._id, e.target.value)
                            }
                          />

                          {/* Options */}
                          <div className="mt-2 space-y-2">
                            {q.options.map((op) => (
                              <div key={op._id} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setCorrectOption(quiz._id, q._id, op._id)}
                                  title="Mark as correct"
                                  className={`p-1 rounded border ${
                                    op.isCorrect
                                      ? "border-green-500 text-green-600"
                                      : "border-gray-300 text-gray-400"
                                  }`}
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                                <input
                                  className="flex-1 px-2 py-1 border rounded"
                                  placeholder="Option text"
                                  value={op.text}
                                  onChange={(e) =>
                                    updateOptionText(quiz._id, q._id, op._id, e.target.value)
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() => removeOption(quiz._id, q._id, op._id)}
                                  className="p-1 text-gray-500 hover:text-red-600"
                                  title="Remove option"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() => addOption(quiz._id, q._id)}
                              className="text-xs mt-1 text-blue-600 hover:text-blue-800"
                            >
                              + Add option
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeQuestion(quiz._id, q._id)}
                          className="text-red-600 mt-1 hover:text-red-800"
                          title="Remove question"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ManageQuiz;
