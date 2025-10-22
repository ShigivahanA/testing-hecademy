import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import { CheckCircle, XCircle, Send, RefreshCw } from "lucide-react";

const EDUCATOR_IDS = [
  "user_32g4gPbfjrB9tHbEPwqUXnh0wel",
  "user_335XtmAQo0FtLNgyIJDK01Wrf4f",
];

const Discussion = ({ courseId, lectureId = null }) => {
  const { getToken, backendUrl, userData } = useContext(AppContext);
  const [threads, setThreads] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [replyInputs, setReplyInputs] = useState({});
  const [loading, setLoading] = useState(false);

  const isEducator = EDUCATOR_IDS.includes(userData?._id);
  const userId = userData?._id;

  // ✅ Fetch all threads (lecture-based or course-based)
  const fetchThreads = async () => {
    try {
      const token = await getToken();
      setLoading(true);

      const endpoint = lectureId
        ? `${backendUrl}/api/discussion/${courseId}/${lectureId}`
        : `${backendUrl}/api/discussion/${courseId}`;

      const { data } = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        const newThreads = data.threads.reverse();
        if (JSON.stringify(newThreads) !== JSON.stringify(threads)) {
          setThreads(newThreads);
        }
      }
    } catch (error) {
      toast.error("Failed to fetch discussions");
    } finally {
      setLoading(false);
    }
  };

  // ⏱ Auto-refresh every 3s
  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 3000);
    return () => clearInterval(interval);
  }, [courseId, lectureId]);

  // ✅ Start new discussion
  const startDiscussion = async () => {
    if (!newQuestion.trim()) return;

    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/discussion/start`,
        { courseId, lectureId, message: newQuestion },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success("New discussion started!");
        setNewQuestion("");
        fetchThreads();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Reply to a thread
  const sendReply = async (questionId) => {
    const message = replyInputs[questionId];
    if (!message?.trim()) return;

    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/discussion/reply`,
        { courseId, lectureId, questionId, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setReplyInputs((prev) => ({ ...prev, [questionId]: "" }));
        fetchThreads();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Mark discussion as resolved/open
  const markDiscussion = async (questionId, status) => {
    try {
      const token = await getToken();
      await axios.patch(
        `${backendUrl}/api/discussion/status`,
        { courseId, lectureId, questionId, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Discussion marked as ${status}`);
      fetchThreads();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Format timestamps
  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });

  // ✅ Loading view
  if (loading && threads.length === 0)
    return (
      <div className="flex justify-center items-center py-10 text-gray-500">
        <RefreshCw className="animate-spin mr-2" /> Loading discussions...
      </div>
    );

  return (
    <div className="sm:m-10 bg-gradient-to-b from-white to-gray-50 border border-gray-200 sm:rounded-2xl shadow-md p-5 sm:p-8 transition-all">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          {lectureId ? "Lecture Discussion" : "Course Discussion"}
        </h2>
        <button
          onClick={fetchThreads}
          className="flex items-center gap-1 text-sm bg-gray-100 px-3 py-1.5 rounded-md hover:bg-gray-200 transition"
        >
          <RefreshCw size={14} className="text-cyan-600" /> Refresh
        </button>
      </div>

      {/* ✏️ New Question (students only) */}
      {!isEducator && (
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder={
              lectureId
                ? "Ask a question about this lecture..."
                : "Ask a question about this course..."
            }
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring focus:ring-cyan-200"
          />
          <button
            onClick={startDiscussion}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Send size={14} /> Ask
          </button>
        </div>
      )}

      {/* 💬 Threads */}
      {threads.length > 0 ? (
        <div className="space-y-6">
          {threads.map((thread) => {
            const isOwner = thread.parentMessage.userId === userId;
            const resolved = thread.status === "resolved";

            return (
              <div
                key={thread.questionId}
                className={`rounded-xl border ${
                  resolved
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-gray-200"
                } shadow-sm hover:shadow-md transition-all duration-300`}
              >
                {/* 🧑‍🎓 Question Header */}
                <div className="flex items-start gap-3 p-4 border-b border-gray-100">
                  <img
                    src={
                      thread.parentMessage.imageUrl || "/default-avatar.png"
                    }
                    alt={thread.parentMessage.name}
                    className="w-10 h-10 rounded-full border border-gray-200"
                  />
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">
                          {thread.parentMessage.name}
                        </p>
                        {isOwner && (
                          <span className="text-xs text-cyan-600 font-medium">
                            (You)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-gray-400">
                        {formatDate(thread.parentMessage.createdAt)}
                      </p>
                    </div>
                    <p className="text-gray-700 text-sm mt-1">
                      {thread.parentMessage.message}
                    </p>
                  </div>
                </div>

                {/* 🧵 Replies */}
                <div className="px-6 py-3 bg-gray-50 rounded-b-xl">
                  <div className="space-y-3">
                    {thread.replies.map((msg, i) => {
                      const isEducatorReply = EDUCATOR_IDS.includes(msg.userId);
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-lg text-sm ${
                            isEducatorReply
                              ? "bg-blue-50 border border-blue-200"
                              : "bg-white border border-gray-200"
                          }`}
                        >
                          <div className="flex justify-between">
                            <p className="font-medium text-gray-800">
                              {msg.name}
                              {isEducatorReply && (
                                <span className="ml-2 text-[11px] bg-blue-600 text-white px-2 py-[1px] rounded-full">
                                  Educator
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {formatDate(msg.createdAt)}
                            </p>
                          </div>
                          <p className="mt-1 text-gray-700">{msg.message}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* ✉️ Reply Input */}
                  {thread.status === "open" && (isEducator || isOwner) && (
                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        value={replyInputs[thread.questionId] || ""}
                        onChange={(e) =>
                          setReplyInputs((prev) => ({
                            ...prev,
                            [thread.questionId]: e.target.value,
                          }))
                        }
                        placeholder="Type your reply..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-cyan-200"
                      />
                      <button
                        onClick={() => sendReply(thread.questionId)}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1 shadow-sm transition"
                      >
                        <Send size={14} /> Reply
                      </button>
                    </div>
                  )}

                  {/* ✅ Status Buttons */}
                  {isOwner && (
                    <div className="flex justify-end mt-4">
                      {resolved ? (
                        <button
                          onClick={() =>
                            markDiscussion(thread.questionId, "open")
                          }
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition"
                        >
                          <XCircle size={14} /> Reopen
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            markDiscussion(thread.questionId, "resolved")
                          }
                          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition"
                        >
                          <CheckCircle size={14} /> Mark as Resolved
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500 text-sm text-center py-8">
          No discussions yet — start the conversation!
        </p>
      )}
    </div>
  );
};

export default Discussion;
