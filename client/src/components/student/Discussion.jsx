import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";

// same list of educator IDs
const EDUCATOR_IDS = [
  "user_32g4gPbfjrB9tHbEPwqUXnh0wel",
  "user_335XtmAQo0FtLNgyIJDK01Wrf4f",
];

const Discussion = ({ courseId }) => {
  const { getToken, backendUrl, userData } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const fetchMessages = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/discussion/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setMessages(data.thread.reverse());
    } catch (error) {
      console.error(error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/discussion/add`,
        { courseId, message: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setMessages(data.thread.reverse());
        setNewMessage("");
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [courseId]);

  return (
    <div className="mt-10 bg-white border border-gray-200 rounded-xl shadow p-5">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
        💬 Course Discussion
      </h2>

      {/* Messages */}
      <div className="max-h-[400px] overflow-y-auto space-y-3 mb-4">
        {messages.length > 0 ? (
          messages.map((msg, index) => {
            const isEducator = EDUCATOR_IDS.includes(msg.userId);
            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-2 rounded-lg ${
                  isEducator ? "bg-blue-50 border border-blue-300" : "bg-gray-50"
                }`}
              >
                <img
                  src={msg.imageUrl || "/default-avatar.png"}
                  alt={msg.name}
                  className="w-8 h-8 rounded-full border"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-700">
                      {msg.name}
                    </p>
                    {isEducator && (
                      <span className="bg-blue-600 text-white text-[10px] font-medium px-2 py-[2px] rounded-full">
                        Educator
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{msg.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500 text-sm">
            No messages yet. Start the discussion!
          </p>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your question or reply..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-200"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Discussion;
