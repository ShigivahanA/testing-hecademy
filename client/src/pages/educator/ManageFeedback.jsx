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

  // Fetch all feedbacks for educator’s courses
  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/feedback/educator`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setFeedbacks(data.feedback || []);
      } else toast.error(data.message);
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
    <div className="flex-1 overflow-y-auto p-6 md:p-8 ">
      <h1 className="text-2xl font-semibold text-gray-800 mb-8">
        Manage Course Feedback
      </h1>

      {feedbacks.length === 0 ? (
        <p className="text-gray-600 text-center mt-10">
          No feedback available yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {feedbacks.map((f, i) => (
            <div
              key={i}
              className={`group flex flex-col justify-between border border-gray-200 rounded-2xl p-5 shadow-sm bg-white transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                f.hidden ? "opacity-60 grayscale" : ""
              }`}
            >
              {/* Header - User Info + Toggle */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={f.user?.imageUrl || assets.profile_icon}
                    alt={f.user?.name || "User"}
                    className="w-10 h-10 rounded-full object-cover border border-gray-300 shadow-sm"
                  />
                  <div>
                    <p className="font-semibold text-gray-800 text-sm sm:text-base">
                      {f.user?.name || "Anonymous User"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(f.date).toLocaleDateString()} •{" "}
                      <span className="text-blue-600 font-medium">
                        {f.courseTitle || "Untitled Course"}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleVisibility(f._id)}
                  className="text-gray-600 hover:text-blue-600 transition"
                  title={f.hidden ? "Unhide Feedback" : "Hide Feedback"}
                >
                  {f.hidden ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Feedback Text */}
              <p className="text-gray-700 text-sm sm:text-[15px] leading-relaxed italic mb-4 flex-1">
                “{f.feedback.length > 180 ? f.feedback.slice(0, 180) + "..." : f.feedback}”
              </p>

              {/* Rating */}
              <div className="flex items-center gap-1 mt-auto">
                {[...Array(5)].map((_, idx) => (
                  <img
                    key={idx}
                    src={idx < f.rating ? assets.star : assets.star_blank}
                    alt="star"
                    className="w-4 h-4 sm:w-5 sm:h-5"
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
