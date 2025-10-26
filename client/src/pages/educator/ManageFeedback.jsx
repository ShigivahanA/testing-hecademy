import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { assets } from "../../assets/assets";

const ManageFeedback = () => {
  const { backendUrl, getToken } = useContext(AppContext);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all feedbacks given to educator’s courses
  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/feedback/educator`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setFeedbacks(data.feedback || []);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load feedbacks");
    } finally {
      setLoading(false);
    }
  };

  // Toggle hide/unhide
  const toggleVisibility = async (feedbackId) => {
    try {
      const token = await getToken();
      const { data } = await axios.put(
        `${backendUrl}/api/feedback/educator/toggle/${feedbackId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message);
        setFeedbacks((prev) =>
          prev.map((f) =>
            f._id === feedbackId ? { ...f, hidden: !f.hidden } : f
          )
        );
      } else toast.error(data.message);
    } catch (err) {
      toast.error("Action failed");
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  if (loading)
    return (
      <div className="flex-1 flex justify-center items-center min-h-[60vh] text-gray-600">
        <Loader2 className="animate-spin mr-2" /> Loading feedback...
      </div>
    );

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        Manage Course Feedback
      </h1>

      {feedbacks.length === 0 ? (
        <p className="text-gray-600 text-center mt-10">
          No feedback available yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {feedbacks.map((f, i) => (
            <div
              key={i}
              className={`flex flex-col justify-between border rounded-xl p-5 shadow-sm bg-white transition hover:shadow-md ${
                f.hidden ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-semibold text-gray-800">
                    {f.user?.name || "Anonymous"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {new Date(f.date).toLocaleDateString()} •{" "}
                    <span className="text-blue-600 font-medium">
                      {f.courseTitle || "Untitled Course"}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => toggleVisibility(f._id)}
                  className="text-gray-600 hover:text-blue-600 transition"
                  title={f.hidden ? "Unhide Feedback" : "Hide Feedback"}
                >
                  {f.hidden ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <p className="text-gray-700 text-sm italic mb-3">
                “{f.feedback}”
              </p>

              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, idx) => (
                  <img
                    key={idx}
                    src={
                      idx < f.rating
                        ? assets.star
                        : assets.star_blank
                    }
                    alt="star"
                    className="w-4 h-4"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageFeedback;
