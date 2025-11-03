import React, { useState, useEffect } from "react";
import axios from "axios";
import { MessageCircle, X, Send } from "lucide-react";

const suggestedQuestions = [
  "What is HTML?",
  "How do I style a button in CSS?",
  "Explain JavaScript variables",
  "How do I start with React?",
];

const AITutorWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWidget, setShowWidget] = useState(true);

  // 🧠 Hide tutor while loading page (matches your Loading component behavior)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const loadingVisible = document.querySelector(".loading-overlay");
      setShowWidget(!loadingVisible);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const sendMessage = async (text) => {
    const question = text || input;
    if (!question.trim()) return;

    const userMsg = { role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await axios.post("/api/aitutor/ask", {
        question,
        user: JSON.parse(localStorage.getItem("userData") || "{}"),
      });

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: data.answer },
        ]);
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

  if (!showWidget) return null; // 🚫 Hide while loading

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-5 right-5 bg-gradient-to-b from-cyan-600 text-black p-4 rounded-full shadow-lg hover:scale-110 transition-all duration-300 z-50 ${
          isOpen ? "rotate-90" : "rotate-0"
        }`}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-5 w-[90vw] sm:w-96 bg-white shadow-2xl rounded-2xl flex flex-col border border-gray-200 z-50 transform transition-all duration-300 ease-in-out origin-bottom-right ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-10 pointer-events-none"
        }`}
        style={{
          maxHeight: "400px",
          minHeight: "400px",
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-b from-cyan-600 text-black p-3 rounded-t-2xl font-semibold flex items-center justify-between">
          <span>Ask AI</span>
        </div>

        {/* Messages */}
        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          {messages.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-10">
              <p className="mb-3 font-medium">Ask me anything about your course!</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3 py-1 rounded-full border border-cyan-400 text-cyan-600 hover:bg-cyan-50 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-cyan-100 text-gray-800 self-end ml-auto"
                  : "bg-cyan-400/70 text-gray-900 self-start mr-auto"
              }`}
              style={{ maxWidth: "80%" }}
            >
              {msg.text}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm mt-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300"></div>
              <span>Thinking...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 p-2 border-t bg-white">
          <input
            type="text"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading}
            className="bg-gradient-to-b from-cyan-600 text-black p-2 rounded-lg hover:bg-blue-600 transition"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
};

export default AITutorWidget;
