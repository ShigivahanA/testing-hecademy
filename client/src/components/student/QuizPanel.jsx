import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const QuizPanel = ({ courseId, chapterId, onClose, onPass }) => {
  const { backendUrl, getToken, userData } = useContext(AppContext);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState("info");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [previousResult, setPreviousResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ✅ Get user's last attempt
  const getPreviousQuizResult = () => {
    if (!userData || !userData.activityLog) return null;

    const attempts = userData.activityLog
      .filter((log) => {
        const logCourseId =
          typeof log.courseId === "object"
            ? log.courseId?._id || log.courseId?.$oid
            : log.courseId;

        return (
          log.action === "completed_quiz" &&
          logCourseId === courseId &&
          log.details?.chapterId === chapterId
        );
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp?.$date || b.timestamp) -
          new Date(a.timestamp?.$date || a.timestamp)
      );

    return attempts.length > 0
      ? {
          score: attempts[0].details?.score ?? 0,
          passed: attempts[0].details?.passed ?? false,
        }
      : null;
  };

  // ✅ Fetch Quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const { data } = await axios.get(
          `${backendUrl}/api/quiz/student/${courseId}?chapterId=${chapterId}`
        );
        if (data.success && data.quizzes.length > 0) {
          const matchedQuiz = data.quizzes.find(
            (q) => q.chapterId === chapterId
          );
          if (matchedQuiz) {
            setQuiz(matchedQuiz);
            setPreviousResult(getPreviousQuizResult());
          } else toast.error("No quiz found for this chapter");
        } else toast.error("No quiz found for this chapter");
      } catch (error) {
        toast.error("Failed to fetch quiz");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [chapterId, courseId]);

  // ✅ Submit Quiz
  const handleSubmit = async () => {
    if (!quiz) return;
    if (Object.keys(answers).length < quiz.questions.length)
      return toast.error("Please answer all questions before submitting!");

    try {
      setSubmitting(true);
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/quiz/submit`,
        {
          quizId: quiz._id,
          answers: Object.entries(answers).map(
            ([questionId, selectedOption]) => ({
              questionId,
              selectedOption,
            })
          ),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setResult(data);
        setStage("result");
        setPreviousResult(getPreviousQuizResult());
        if (data.passed) onPass(chapterId);
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // === Loading & Empty State ===
  if (loading)
    return (
      <div className="flex justify-center items-center py-16 text-gray-600">
        <Loader2 className="animate-spin mr-3 text-blue-600" /> Loading your
        quiz...
      </div>
    );

  if (!quiz)
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-6 text-lg">
          No quiz is available for this chapter yet.
        </p>
        <button
          onClick={onClose}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all duration-300"
        >
          Back
        </button>
      </div>
    );

  // === UI START ===
  return (
    <motion.div
      className="mx-auto w-full p-5 sm:p-8 relative overflow-hidden"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* === QUIZ INFO STAGE === */}
      {stage === "info" && (
        <motion.div
          key="info"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800 mb-2">
            {quiz.title}
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mb-2">
            {quiz.questions.length} Questions • Passing Score:{" "}
            {quiz.passPercentage}%
          </p>

          {previousResult && (
            <div className="bg-blue-100/70 border border-blue-300 rounded-lg py-4 px-5 mb-5 mt-4">
              <p className="text-gray-700 text-sm sm:text-base">
                Your last attempt:{" "}
                <span
                  className={`${
                    previousResult.passed ? "text-green-600" : "text-red-600"
                  } font-semibold`}
                >
                  {previousResult.score}%
                </span>{" "}
                ({previousResult.passed ? "Passed" : "Not Passed"})
              </p>
            </div>
          )}

          <div className="text-left bg-white border border-gray-200 rounded-xl shadow-sm p-5 mt-6">
            <ul className="text-gray-600 space-y-2 text-sm sm:text-base">
              <li>• Navigate between questions easily.</li>
              <li>• Submit anytime to view your score instantly.</li>
              <li>• You can reattempt the quiz to improve your score.</li>
            </ul>
          </div>

          <button
            onClick={() => setStage("question")}
            className="mt-8 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition-transform hover:scale-105 shadow-md"
          >
            Start Quiz
          </button>
        </motion.div>
      )}

      {/* === QUESTION STAGE === */}
      {stage === "question" && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
          >
            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-xs sm:text-sm text-gray-500 mb-1">
                <span>
                  Question {currentQ + 1} / {quiz.questions.length}
                </span>
                <span>
                  {Math.round(
                    (Object.keys(answers).length / quiz.questions.length) * 100
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5"
                  style={{
                    width: `${
                      (Object.keys(answers).length / quiz.questions.length) *
                      100
                    }%`,
                  }}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      (Object.keys(answers).length / quiz.questions.length) *
                      100
                    }%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="border rounded-xl p-5 bg-white shadow-sm">
              <p className="font-semibold text-gray-800 mb-4 text-base sm:text-lg leading-relaxed">
                {quiz.questions[currentQ].questionText}
              </p>
              <div className="space-y-3">
                {quiz.questions[currentQ].options.map((opt, j) => (
                  <label
                    key={j}
                    className={`flex items-center gap-3 text-sm sm:text-base px-4 py-3 rounded-md border cursor-pointer transition-all duration-200 ${
                      answers[quiz.questions[currentQ]._id] === opt.text
                        ? "bg-blue-100 border-blue-600 text-blue-800 font-semibold shadow-sm"
                        : "bg-gray-50 hover:bg-gray-100 border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name={quiz.questions[currentQ]._id}
                      value={opt.text}
                      checked={
                        answers[quiz.questions[currentQ]._id] === opt.text
                      }
                      onChange={(e) =>
                        setAnswers({
                          ...answers,
                          [quiz.questions[currentQ]._id]: e.target.value,
                        })
                      }
                      className="accent-blue-600"
                    />
                    <span>{opt.text}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8">
              <button
                disabled={currentQ === 0}
                onClick={() => setCurrentQ((q) => q - 1)}
                className={`flex justify-center items-center gap-2 px-5 py-2.5 rounded-lg border text-gray-700 font-medium ${
                  currentQ === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-100"
                }`}
              >
                <ChevronLeft size={18} /> Previous
              </button>

              {currentQ < quiz.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQ((q) => q + 1)}
                  className="flex justify-center items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-semibold transition-all"
                >
                  Next <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`flex justify-center items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 font-semibold transition-all ${
                    submitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Submitting
                      ...
                    </>
                  ) : (
                    "Submit Quiz"
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* === RESULT STAGE === */}
      {stage === "result" && result && (
        <motion.div
          key="result"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`text-center mt-8 p-8 sm:p-10 relative overflow-hidden`}
        >

          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              {result.passed ? (
                <CheckCircle2 className="text-green-600 drop-shadow-md" size={80} />
              ) : (
                <XCircle className="text-red-600 drop-shadow-md" size={80} />
              )}
            </motion.div>

            <h2
              className={`text-4xl font-extrabold mb-2 tracking-tight ${
                result.passed ? "text-green-700" : "text-red-700"
              }`}
            >
              {result.score}%
            </h2>

            <p
              className={`font-semibold text-lg sm:text-xl mb-8 ${
                result.passed ? "text-green-600" : "text-red-600"
              }`}
            >
              {result.passed ? "You Passed 🎉" : "You Didn’t Pass 😔"}
            </p>
            <p
              className={`font-semibold text-lg sm:text-xl mb-8 `}
            >
              Please refresh the page to see updated progress. if not updated automatically
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-sm hover:shadow-md"
              >
                Back to Course
              </button>

              <button
                onClick={() => {
                  setStage("question");
                  setResult(null);
                  setAnswers({});
                  setCurrentQ(0);
                }}
                className={`w-full sm:w-auto px-6 py-3 rounded-lg font-semibold transition-transform duration-300 hover:scale-105 shadow-sm hover:shadow-md text-white ${
                  result.passed
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Reattempt Quiz
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default QuizPanel;
