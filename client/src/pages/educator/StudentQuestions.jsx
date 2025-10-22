import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";

const EDUCATOR_IDS = [
  "user_32g4gPbfjrB9tHbEPwqUXnh0wel",
  "user_335XtmAQo0FtLNgyIJDK01Wrf4f",
];

const StudentQuestions = () => {
  const { backendUrl, getToken } = useContext(AppContext);
  const [discussions, setDiscussions] = useState([]);
  const [replyInputs, setReplyInputs] = useState({}); // track input per question

  const fetchAllQuestions = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(
        `${backendUrl}/api/discussion/educator/all`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (data.success) setDiscussions(data.discussions);
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchAllQuestions();
  }, []);

  const replyToCourse = async (courseId, message) => {
    if (!message.trim()) return;
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/discussion/add`,
        { courseId, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("Reply posted!");
        fetchAllQuestions();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Handle typing replies per question
  const handleReplyChange = (courseId, value) => {
    setReplyInputs((prev) => ({ ...prev, [courseId]: value }));
  };

  const handleSendReply = (courseId) => {
    const message = replyInputs[courseId];
    if (!message || !message.trim()) return;
    replyToCourse(courseId, message);
    setReplyInputs((prev) => ({ ...prev, [courseId]: "" }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">📩 Student Discussions</h1>

      {discussions.length === 0 && (
        <p className="text-gray-500">No student questions yet.</p>
      )}

      {discussions.map((disc, index) => (
        <div
          key={index}
          className="border border-gray-200 bg-white rounded-lg p-4 mb-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold mb-3 text-gray-800">
            {disc.courseId?.courseTitle || "Unknown Course"}
          </h2>

          {/* Each thread message */}
          {disc.thread.length > 0 ? (
            disc.thread.map((msg, i) => {
              const isEducator = EDUCATOR_IDS.includes(msg.userId);
              return (
                <div
                  key={i}
                  className={`p-3 mb-3 rounded-lg ${
                    isEducator
                      ? "bg-blue-50 border border-blue-300"
                      : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={msg.imageUrl || "/default-avatar.png"}
                      alt={msg.name}
                      className="w-8 h-8 rounded-full border"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-800">
                            {msg.name}
                          </p>
                          {isEducator && (
                            <span className="bg-blue-600 text-white text-[10px] font-medium px-2 py-[2px] rounded-full">
                              Educator
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400">
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-gray-700 text-sm mt-1">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 italic mb-3">
              No messages yet for this course.
            </p>
          )}

          {/* Educator reply input (always visible for this course) */}
          <div className="flex items-center gap-2 mt-3">
            <input
              type="text"
              value={replyInputs[disc.courseId._id] || ""}
              onChange={(e) =>
                handleReplyChange(disc.courseId._id, e.target.value)
              }
              placeholder="Type your reply to this discussion..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-200"
            />
            <button
              onClick={() => handleSendReply(disc.courseId._id)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              Reply
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StudentQuestions;
