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
import { motion } from "framer-motion";

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

  // ✅ Get user's last attempt directly from activityLog
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
        // ✅ Pick quiz that matches the current chapterId
        const matchedQuiz = data.quizzes.find(q => q.chapterId === chapterId);

        if (matchedQuiz) {
          setQuiz(matchedQuiz)
          setPreviousResult(getPreviousQuizResult());
        }
        else toast.error("No quiz found for this chapter");
      } else {
        toast.error("No quiz found for this chapter");
      }
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
  setPreviousResult(getPreviousQuizResult()); // ✅ update immediately
  if (data.passed) onPass(chapterId);

  // ✅ NEW: Refresh user data so Player sees updated activityLog
  if (typeof window !== "undefined" && window.location) {
    // Try refetching user activity from backend via AppContext if available
    if (typeof getToken === "function") {
      try {
        const token = await getToken();
        await axios.get(`${backendUrl}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.warn("Could not refresh user data:", err.message);
      }
    }
  }
}
else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // === Loading & Empty State ===
  if (loading)
    return (
      <div className="flex justify-center items-center py-12 text-gray-600">
        <Loader2 className="animate-spin mr-2" /> Loading Quiz...
      </div>
    );

  if (!quiz)
    return (
      <div className="text-center p-10">
        <p className="text-gray-600 mb-4">No quiz found for this chapter.</p>
        <button
          onClick={onClose}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Back
        </button>
      </div>
    );

  return (
    <div className="bg-white rounded-lg shadow-md p-5 sm:p-8 w-full mx-auto max-w-3xl transition-all duration-300">
      {/* === QUIZ INFO STAGE === */}
      {stage === "info" && (
        <div className="text-center px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
            {quiz.title}
          </h2>
          <p className="text-gray-600 mb-1">
            Total Questions: {quiz.questions.length}
          </p>
          <p className="text-gray-600 mb-4">
            Pass Percentage: {quiz.passPercentage}%
          </p>

          {/* ✅ Show previous score */}
          {previousResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg py-3 px-4 mb-5">
              <p className="text-gray-700 font-medium">
                Previous Score: {" "}
                <span
                  className={`${
                    previousResult.passed ? "text-green-600" : "text-red-600"
                  } font-semibold`}
                >
                  {previousResult.score}%
                </span>{" "}
                {/* {previousResult.passed ? "Passed" : "Not Passed"} */}
              </p>
            </div>
          )}

          <div className="text-left text-sm sm:text-base text-gray-500 mt-4 bg-gray-50 rounded-xl p-5">
            <p>• You can navigate using Next and Previous buttons.</p>
            <p>• Once submitted, your score will be shown immediately.</p>
            <p>• You can reattempt to improve your score.</p>
          </div>

          <button
            onClick={() => setStage("question")}
            className="mt-6 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-all"
          >
            Start Quiz
          </button>
        </div>
      )}

      {/* === QUESTION STAGE === */}
      {stage === "question" && (
        <div className="w-full">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs sm:text-sm text-gray-500 mb-1">
              <span>
                Question {currentQ + 1} of {quiz.questions.length}
              </span>
              <span>
                {Math.round(
                  (Object.keys(answers).length / quiz.questions.length) * 100
                )}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    (Object.keys(answers).length / quiz.questions.length) * 100
                  }%`,
                }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <div className="border rounded-xl p-5 bg-gray-50">
            <p className="font-semibold text-gray-800 mb-4 text-base sm:text-lg">
              {quiz.questions[currentQ].questionText}
            </p>
            <div className="space-y-3">
              {quiz.questions[currentQ].options.map((opt, j) => (
                <label
                  key={j}
                  className={`flex items-center gap-2 text-sm sm:text-base px-3 py-2 border rounded-md cursor-pointer transition-all ${
                    answers[quiz.questions[currentQ]._id] === opt.text
                      ? "bg-blue-100 border-blue-500 text-blue-800"
                      : "hover:bg-gray-100 border-gray-300"
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
                  <span className="flex-1">{opt.text}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
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
                className="flex justify-center items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-all"
              >
                Next <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`flex justify-center items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 font-medium transition-all ${
                  submitting ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Submitting...
                  </>
                ) : (
                  "Submit Quiz"
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* === RESULT STAGE === */}
      {stage === "result" && result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-4 mt-4 sm:p-6"
        >
          <div className="flex justify-center mb-4">
            {result.passed ? (
              <CheckCircle2 className="text-green-600" size={64} />
            ) : (
              <XCircle className="text-red-600" size={64} />
            )}
          </div>

          <h2 className="text-3xl font-bold mb-2">{result.score}%</h2>
          <p
            className={`font-medium text-lg mb-6 ${
              result.passed ? "text-green-600" : "text-red-600"
            }`}
          >
            {result.passed ? "You Passed" : "You Didn’t Pass"}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium transition-all"
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
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all"
            >
              Reattempt Quiz
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default QuizPanel;
