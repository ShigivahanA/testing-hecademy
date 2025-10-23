import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import { X } from "lucide-react";

const QuizModal = ({ courseId, chapterId, onClose }) => {
  const { backendUrl, getToken } = useContext(AppContext);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get(`${backendUrl}/api/quiz/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const found = data.quizzes.find((q) => q.chapterId === chapterId);
        setQuiz(found || null);
      } catch {
        toast.error("Failed to fetch quiz");
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [chapterId]);

  const handleSubmit = async () => {
    if (!quiz) return;
    const token = await getToken();

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/quiz/submit`,
        {
          quizId: quiz._id,
          answers: Object.entries(answers).map(([questionId, selectedOption]) => ({
            questionId,
            selectedOption,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setResult(data);
        toast.success(
          data.passed
            ? `🎉 You passed with ${data.score}%!`
            : `❌ You scored ${data.score}%. Try again!`
        );
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 text-white text-sm">
        Loading Quiz...
      </div>
    );

  if (!quiz)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
        <div className="bg-white p-6 rounded-lg text-center shadow-lg w-[90%] max-w-md">
          <p className="text-gray-700">No quiz found for this chapter.</p>
          <button
            onClick={onClose}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black/60 z-50">
      <div className="bg-white rounded-lg w-[90%] md:w-[600px] max-h-[90vh] overflow-y-auto shadow-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
        >
          <X size={20} />
        </button>

        {!result ? (
          <>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {quiz.title}
            </h2>
            <div className="space-y-5">
              {quiz.questions.map((q, i) => (
                <div key={q._id} className="border-b pb-3">
                  <p className="font-medium text-gray-800 mb-2">
                    {i + 1}. {q.questionText}
                  </p>
                  {q.options.map((opt) => (
                    <label
                      key={opt.text}
                      className="flex items-center gap-2 text-sm text-gray-700 mb-1"
                    >
                      <input
                        type="radio"
                        name={q._id}
                        value={opt.text}
                        checked={answers[q._id] === opt.text}
                        onChange={(e) =>
                          setAnswers({ ...answers, [q._id]: e.target.value })
                        }
                      />
                      {opt.text}
                    </label>
                  ))}
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-medium"
            >
              Submit Quiz
            </button>
          </>
        ) : (
          <div className="text-center p-4">
            <h2 className="text-lg font-bold mb-2">
              Score: {result.score}%
            </h2>
            <p
              className={`font-medium ${
                result.passed ? "text-green-600" : "text-red-600"
              }`}
            >
              {result.passed ? "You Passed! 🎉" : "You Failed 😔"}
            </p>
            <button
              onClick={onClose}
              className="mt-5 bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizModal;
