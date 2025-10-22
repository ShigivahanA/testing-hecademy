import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import { CheckCircle, XCircle } from "lucide-react";

const EDUCATOR_IDS = [
  "user_32g4gPbfjrB9tHbEPwqUXnh0wel",
  "user_335XtmAQo0FtLNgyIJDK01Wrf4f",
];

const Discussion = ({ courseId }) => {
  const { getToken, backendUrl, userData } = useContext(AppContext);
  const [threads, setThreads] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [replyInputs, setReplyInputs] = useState({});

  const isEducator = EDUCATOR_IDS.includes(userData?._id);
  const userId = userData?._id;

  // ✅ Fetch all threads
  const fetchThreads = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/discussion/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setThreads(data.threads.reverse());
    } catch (error) {
      toast.error("Failed to fetch discussions");
    }
  };

  useEffect(() => {
  fetchThreads(); // Initial load

  // 🔁 Poll every 5 seconds for new updates
  const interval = setInterval(() => {
    fetchThreads();
  }, 5000);

  return () => clearInterval(interval); // Cleanup when unmounted
}, [courseId]);

  // ✅ Start new discussion (student only)
  const startDiscussion = async () => {
    if (!newQuestion.trim()) return;
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/discussion/start`,
        { courseId, message: newQuestion },
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

  // ✅ Reply (educator or thread owner)
  const sendReply = async (questionId) => {
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
        setReplyInputs((prev) => ({ ...prev, [questionId]: "" }));
        fetchThreads();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Mark Complete or Reopen (only owner)
  const markDiscussion = async (questionId, status) => {
    try {
      const token = await getToken();
      await axios.patch(
        `${backendUrl}/api/discussion/status`,
        { courseId, questionId, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Discussion marked as ${status}`);
      fetchThreads();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Date formatter helper
  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="sm:m-10 bg-white border border-gray-200 rounded-xl shadow p-5">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
        Course Discussion
      </h2>

      {/* ✅ Only students can start a discussion */}
      {!isEducator && (
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask a new question..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-200"
          />
          <button
            onClick={startDiscussion}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            Ask
          </button>
        </div>
      )}

      {/* ✅ Thread List */}
      {threads.length > 0 ? (
        threads.map((thread) => {
          const isOwner = thread.parentMessage.userId === userId;
          return (
            <div
              key={thread.questionId}
              className={`border rounded-lg mb-4 p-4 ${
                thread.status === "resolved"
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              {/* 🧑‍🎓 Question */}
              <div className="flex items-start gap-3">
                <img
                  src={thread.parentMessage.imageUrl || "/default-avatar.png"}
                  alt={thread.parentMessage.name}
                  className="w-8 h-8 rounded-full border"
                />
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">
                        {thread.parentMessage.name}
                      </p>
                      {isOwner && (
                        <span className="text-xs text-blue-600 font-semibold">
                          (You)
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-400">
                      {formatDate(thread.parentMessage.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">
                    {thread.parentMessage.message}
                  </p>

                  {/* ✅ Owner actions */}
                  {isOwner && (
                    <div className="flex gap-2 mt-2">
                      {thread.status === "open" ? (
                        <button
                          onClick={() =>
                            markDiscussion(thread.questionId, "resolved")
                          }
                          className="text-green-600 flex items-center gap-1 text-xs hover:text-green-700"
                        >
                          <CheckCircle size={14} /> Mark Complete
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            markDiscussion(thread.questionId, "open")
                          }
                          className="text-red-500 flex items-center gap-1 text-xs hover:text-red-600"
                        >
                          <XCircle size={14} /> Reopen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 💬 Replies */}
              <div className="ml-10 mt-3 space-y-2">
                {thread.replies.map((msg, idx) => {
                  const isEducatorReply = EDUCATOR_IDS.includes(msg.userId);
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg ${
                        isEducatorReply
                          ? "bg-blue-50 border border-blue-300"
                          : "bg-gray-100"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-gray-800">
                          {msg.name}{" "}
                          {isEducatorReply && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-[1px] rounded-md ml-1">
                              Educator
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400">
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{msg.message}</p>
                    </div>
                  );
                })}

                {/* ✅ Reply input */}
                {thread.status === "open" && (isEducator || isOwner) && (
                  <div className="flex gap-2 mt-2">
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
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-200"
                    />
                    <button
                      onClick={() => sendReply(thread.questionId)}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700"
                    >
                      Reply
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-gray-500 text-sm">No discussions yet.</p>
      )}
    </div>
  );
};

export default Discussion;
