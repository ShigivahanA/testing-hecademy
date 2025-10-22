import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import { ChevronDown, ChevronUp, Send, RefreshCw } from "lucide-react";

const EDUCATOR_IDS = [
  "user_32g4gPbfjrB9tHbEPwqUXnh0wel",
  "user_335XtmAQo0FtLNgyIJDK01Wrf4f",
];

const StudentQuestions = () => {
  const { backendUrl, getToken } = useContext(AppContext);
  const [discussions, setDiscussions] = useState([]);
  const [replyInputs, setReplyInputs] = useState({});
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAllQuestions = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/discussion/educator/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setDiscussions(data.discussions);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllQuestions();
    const interval = setInterval(fetchAllQuestions, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleReplyChange = (threadId, value) => {
    setReplyInputs((prev) => ({ ...prev, [threadId]: value }));
  };

  const handleSendReply = async (courseId, questionId) => {
    const message = replyInputs[questionId];
    if (!message?.trim()) return;

    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/discussion/reply`,
        { courseId, questionId, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("Reply posted!");
        setReplyInputs((prev) => ({ ...prev, [questionId]: "" }));
        fetchAllQuestions();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500 text-sm sm:text-base">
        <RefreshCw className="animate-spin mr-2" /> Loading discussions...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-3 sm:px-8 py-6 text-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          Student Discussions
        </h1>
        <button
          onClick={fetchAllQuestions}
          className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm text-gray-600 shadow-sm transition"
        >
          <RefreshCw size={14} className="text-blue-600" /> Refresh
        </button>
      </div>

      {discussions.length === 0 ? (
        <p className="text-gray-500 text-center py-10 text-sm italic">
          No student questions yet.
        </p>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {discussions.map((disc, index) => {
            const isExpanded = expandedCourse === index;
            const courseTitle = disc.courseId?.courseTitle || "Unknown Course";

            return (
              <div
                key={index}
                className="border border-gray-200 bg-white/70 backdrop-blur-md shadow-sm sm:shadow-md rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                {/* HEADER */}
                <div
                  className="flex justify-between items-center px-4 sm:px-5 py-3 sm:py-4 cursor-pointer bg-gradient-to-r from-blue-50 to-cyan-50"
                  onClick={() =>
                    setExpandedCourse(isExpanded ? null : index)
                  }
                >
                  <h2 className="font-semibold text-base sm:text-lg text-gray-800 truncate">
                    {courseTitle}
                  </h2>
                  {isExpanded ? (
                    <ChevronUp size={18} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-500" />
                  )}
                </div>

                {/* THREADS */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 border-t border-gray-100 transition-all">
                    {disc.threads && disc.threads.length > 0 ? (
                      disc.threads.map((thread, i) => {
                        const resolved =
                          thread.status?.toLowerCase() === "resolved";

                        return (
                          <div
                            key={i}
                            className={`rounded-lg sm:rounded-xl border shadow-sm p-3 sm:p-4 transition-all duration-300 ${
                              resolved
                                ? "bg-green-50 border-green-200"
                                : "bg-red-50 border-red-200"
                            }`}
                          >
                            {/* STUDENT QUESTION */}
                            <div className="flex items-start gap-2 sm:gap-3">
                              <img
                                src={
                                  thread.parentMessage.imageUrl ||
                                  "/default-avatar.png"
                                }
                                alt={thread.parentMessage.name}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-gray-200"
                              />
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-gray-800 text-sm sm:text-base">
                                      {thread.parentMessage.name}
                                    </p>
                                    {resolved ? (
                                      <span className="text-[10px] sm:text-[11px] bg-green-600 text-white px-2 py-[1px] rounded-full">
                                        Resolved
                                      </span>
                                    ) : (
                                      <span className="text-[10px] sm:text-[11px] bg-red-400 text-white px-2 py-[1px] rounded-full">
                                        Open
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[9px] sm:text-[11px] text-gray-400 mt-1 sm:mt-0">
                                    {new Date(
                                      thread.parentMessage.createdAt
                                    ).toLocaleString()}
                                  </p>
                                </div>
                                <p className="text-gray-700 text-xs sm:text-sm mt-1 leading-relaxed">
                                  {thread.parentMessage.message}
                                </p>
                              </div>
                            </div>

                            {/* REPLIES */}
                            <div className="ml-6 sm:ml-10 mt-3 space-y-2 sm:space-y-3">
                              {thread.replies?.length > 0 ? (
                                thread.replies.map((reply, rIndex) => {
                                  const isEducator =
                                    EDUCATOR_IDS.includes(reply.userId);
                                  return (
                                    <div
                                      key={rIndex}
                                      className={`p-2 sm:p-3 rounded-lg ${
                                        isEducator
                                          ? "bg-blue-50 border border-blue-200"
                                          : "bg-gray-100"
                                      }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        <img
                                          src={
                                            reply.imageUrl ||
                                            "/default-avatar.png"
                                          }
                                          alt={reply.name}
                                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border"
                                        />
                                        <div>
                                          <p className="text-xs sm:text-sm font-medium text-gray-800 flex items-center gap-1">
                                            {reply.name}
                                            {isEducator && (
                                              <span className="text-[9px] sm:text-[10px] bg-blue-600 text-white px-2 py-[1px] rounded-full">
                                                Educator
                                              </span>
                                            )}
                                          </p>
                                          <p className="text-xs sm:text-sm text-gray-700 mt-[2px] leading-relaxed">
                                            {reply.message}
                                          </p>
                                          <p className="text-[9px] sm:text-[10px] text-gray-400 mt-1">
                                            {new Date(
                                              reply.createdAt
                                            ).toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-gray-500 text-xs italic">
                                  No replies yet.
                                </p>
                              )}
                            </div>

                            {/* REPLY BOX */}
                            {!resolved && (
                              <div className="flex flex-col sm:flex-row items-center gap-2 mt-3 ml-6 sm:ml-10">
                                <input
                                  type="text"
                                  value={
                                    replyInputs[thread.questionId] || ""
                                  }
                                  onChange={(e) =>
                                    handleReplyChange(
                                      thread.questionId,
                                      e.target.value
                                    )
                                  }
                                  placeholder="Write your reply..."
                                  className="w-full flex-1 border border-gray-300 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring focus:ring-blue-200"
                                />
                                <button
                                  onClick={() =>
                                    handleSendReply(
                                      disc.courseId._id,
                                      thread.questionId
                                    )
                                  }
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm flex items-center justify-center sm:justify-normal gap-1 sm:gap-2 shadow-sm transition-all w-full sm:w-auto text-center"
                                >
                                  <Send size={13} /> Reply
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 italic text-xs sm:text-sm">
                        No questions for this course.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentQuestions;
