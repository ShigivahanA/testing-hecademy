import React, { useState } from "react";
import axios from "axios";
import { MessageCircle, X } from "lucide-react";

const AITutorWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await axios.post("/api/aitutor/ask", {
        question: input,
        user: JSON.parse(localStorage.getItem("userData") || "{}"),
      });

      if (data.success) {
        setMessages((prev) => [...prev, { role: "ai", text: data.answer }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text:
              "⚠️ Sorry, I’m currently unavailable (quota reached). Please try again later.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "⚠️ Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 bg-gradient-to-r from-blue-600 to-cyan-400 text-white p-4 rounded-full shadow-xl hover:scale-110 transition-all z-50"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-5 w-80 sm:w-96 bg-white shadow-xl rounded-2xl flex flex-col border border-gray-200 z-50">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white p-3 rounded-t-2xl font-semibold">
            💬 Ask AI Tutor
          </div>

          <div className="flex-1 p-3 overflow-y-auto max-h-96 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-2 rounded-xl max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-blue-100 self-end ml-auto"
                    : "bg-gray-100 self-start"
                }`}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="text-gray-400 text-sm">Thinking...</div>
            )}
          </div>

          <div className="flex items-center gap-2 p-2 border-t">
            <input
              type="text"
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 transition"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AITutorWidget;
