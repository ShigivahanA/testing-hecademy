import React, { useContext, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import Rating from "../../components/student/Rating";

const Feedback = () => {
  const { getToken, backendUrl } = useContext(AppContext);
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!rating && !comment.trim()) {
    toast.error("Please provide feedback before submitting");
    return;
  }

  try {
    setSubmitting(true);
    const token = await getToken();
    const { data } = await axios.post(
      `${backendUrl}/api/user/feedback`,
      { courseId, rating, feedback: comment },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (data.success) {
      toast.success("Thank you for your feedback!");
      navigate(`/player/${courseId}`); // redirect back to course
    } else {
      toast.error(data.message || "Error saving feedback");
    }
  } catch (err) {
    toast.error(err.message);
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 p-6">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full border border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-800 text-center mb-4">
          Course Feedback
        </h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          We’d love to hear your thoughts about this course.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center">
            <Rating initialRating={rating} onRate={setRating} />
            <p className="text-xs text-gray-500 mt-2">
              Tap to select your rating
            </p>
          </div>

          <textarea
            rows="4"
            placeholder="Your feedback..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          ></textarea>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Feedback;
