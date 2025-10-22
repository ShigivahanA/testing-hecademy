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
  const [replyInputs, setReplyInputs] = useState({}); // reply per thread

  // ✅ Fetch all discussions across courses
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
  fetchAllQuestions(); // Initial load

  // 🔁 Poll every 5 seconds
  const interval = setInterval(() => {
    fetchAllQuestions();
  }, 5000);

  return () => clearInterval(interval);
}, []);

  // ✅ Handle input change for replies
  const handleReplyChange = (threadId, value) => {
    setReplyInputs((prev) => ({ ...prev, [threadId]: value }));
  };

  // ✅ Post educator reply
  const handleSendReply = async (courseId, questionId) => {
    const message = replyInputs[questionId];
    if (!message || !message.trim()) return;
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/discussion/reply`,
        { courseId, questionId, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("Reply posted!");
        fetchAllQuestions();
        setReplyInputs((prev) => ({ ...prev, [questionId]: "" }));
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="flex flex-col w-full h-screen overflow-y-scroll md:p-8 p-4 bg-gray-50 text-gray-700">
      {/* HEADER */}
      <h1 className="text-xl md:text-2xl font-bold mb-6">Student Discussions</h1>

      {/* Empty State */}
      {discussions.length === 0 && (
        <p className="text-gray-500 text-sm md:text-base">No student questions yet.</p>
      )}

      {/* DISCUSSION LIST */}
      <div className="flex flex-col gap-5">
        {discussions.map((disc, index) => (
          <div
            key={index}
            className="border border-gray-200 bg-white rounded-lg shadow-sm p-4 md:p-6 transition hover:shadow-md"
          >
            {/* Course Title */}
            <h2 className="text-base md:text-lg font-semibold mb-4 text-gray-800">
              {disc.courseId?.courseTitle || "Unknown Course"}
            </h2>

            {/* Threads */}
            {disc.threads && disc.threads.length > 0 ? (
              disc.threads.map((thread, i) => (
                <div
                  key={i}
                  className={`border rounded-lg p-3 md:p-4 mb-4 ${
                    thread.status === "resolved"
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  {/* 🧑‍🎓 Parent Question */}
                  <div className="flex items-start gap-3">
                    <img
                      src={thread.parentMessage.imageUrl || "/default-avatar.png"}
                      alt={thread.parentMessage.name}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full border"
                    />
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm md:text-base text-gray-800">
                            {thread.parentMessage.name}
                          </p>
                          {thread.parentMessage.isEducator && (
                            <span className="bg-blue-600 text-white text-[10px] md:text-xs font-medium px-2 py-[2px] rounded-full">
                              Educator
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] md:text-xs text-gray-400">
                          {new Date(thread.parentMessage.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-gray-700 text-sm md:text-base mt-1 leading-relaxed">
                        {thread.parentMessage.message}
                      </p>
                    </div>
                  </div>

                  {/* 💬 Replies */}
                  <div className="ml-8 md:ml-12 mt-3 space-y-2">
                    {thread.replies && thread.replies.length > 0 ? (
                      thread.replies.map((reply, rIndex) => {
                        const isEducator = EDUCATOR_IDS.includes(reply.userId);
                        return (
                          <div
                            key={rIndex}
                            className={`p-2 md:p-3 rounded-lg ${
                              isEducator
                                ? "bg-blue-50 border border-blue-300"
                                : "bg-gray-100"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <img
                                src={reply.imageUrl || "/default-avatar.png"}
                                alt={reply.name}
                                className="w-6 h-6 md:w-8 md:h-8 rounded-full border"
                              />
                              <div>
                                <p className="text-xs md:text-sm font-medium text-gray-800">
                                  {reply.name}{" "}
                                  {isEducator && (
                                    <span className="text-[10px] bg-blue-600 text-white px-2 py-[1px] rounded-md ml-1">
                                      Educator
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs md:text-sm text-gray-700 mt-[2px]">
                                  {reply.message}
                                </p>
                                <p className="text-[9px] md:text-[11px] text-gray-400 mt-1">
                                  {new Date(reply.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 text-xs md:text-sm italic">
                        No replies yet.
                      </p>
                    )}
                  </div>

                  {/* ✏️ Educator Reply Box */}
                  {thread.status !== "resolved" && (
                    <div className="flex items-center gap-2 mt-3 ml-8 md:ml-12">
                      <input
                        type="text"
                        value={replyInputs[thread.questionId] || ""}
                        onChange={(e) =>
                          handleReplyChange(thread.questionId, e.target.value)
                        }
                        placeholder="Type your reply..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring focus:ring-blue-200"
                      />
                      <button
                        onClick={() =>
                          handleSendReply(disc.courseId._id, thread.questionId)
                        }
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs md:text-sm hover:bg-blue-700 transition"
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic text-sm md:text-base">
                No questions for this course.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentQuestions;
