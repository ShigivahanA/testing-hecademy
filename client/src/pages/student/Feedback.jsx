import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { SendHorizontal, Loader2 } from "lucide-react";

const Feedback = () => {
  const { getToken, backendUrl } = useContext(AppContext);
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🟦 Check if user already submitted feedback
  useEffect(() => {
    const checkFeedbackStatus = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get(
          `${backendUrl}/api/user/check-feedback/${courseId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (data.alreadySubmitted) {
          navigate(`/player/${courseId}`); // redirect immediately
        } else {
          setLoading(false); // allow to show form
        }
      } catch (err) {
        toast.error("Error checking feedback status");
        navigate(`/player/${courseId}`);
      }
    };
    checkFeedbackStatus();
  }, [courseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error("Please write your feedback before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/user/feedback`,
        { courseId, feedback: comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success("Thank you for your feedback!");
        navigate(`/player/${courseId}`);
      } else if (data.alreadySubmitted) {
        navigate(`/player/${courseId}`);
      } else {
        toast.error(data.message || "Error saving feedback");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-600">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-cyan-100/70 via-white to-white px-6 py-12">
      <div className="w-full max-w-lg  p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            We Value Your Feedback
          </h1>
          <p className="text-sm text-gray-600">
            Tell us what you think about this course — your words help us improve.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <textarea
            rows="6"
            placeholder="Share your thoughts about the course..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none transition"
          ></textarea>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 rounded-xl shadow-md transition-all disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Submitting...
              </>
            ) : (
              <>
                <SendHorizontal size={18} />
                Submit Feedback
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Feedback;
