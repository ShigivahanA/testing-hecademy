// client/src/pages/student/CodeEditor.jsx
import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import Footer from "../../components/student/Footer";
import { toast } from "react-toastify";

const languages = [
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "JavaScript", value: "javascript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
];

const CodeEditor = () => {
  const [language, setLanguage] = useState("html");
  const [code, setCode] = useState("<h1>Hello, world!</h1>");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRunCode = async () => {
    setLoading(true);
    setOutput("");

    try {
      if (language === "html" || language === "css" || language === "javascript") {
        const html = `
          <html>
            <head><style>${language === "css" ? code : ""}</style></head>
            <body>
              ${language === "html" ? code : ""}
              <script>${language === "javascript" ? code : ""}</script>
            </body>
          </html>`;
        const iframe = document.getElementById("outputFrame");
        iframe.srcdoc = html;
        setLoading(false);
        return;
      }

      // For Python & Java – use backend execution
      const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/code/run`, {
        language,
        code,
      });

      if (data.success) {
        setOutput(data.output);
      } else {
        setOutput("Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error running code");
      setOutput(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-10">
        <div className="max-w-7xl mx-auto bg-white shadow-md rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Code Editor</h1>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-2 border rounded-md bg-gray-100 text-gray-700"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Editor */}
          <div className="border rounded-md overflow-hidden">
            <Editor
              height="50vh"
              language={language === "html" ? "html" : language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value)}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleRunCode}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Running..." : "Run Code"}
            </button>
          </div>

          {/* Output Section */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-700">Output:</h2>
            {language === "html" || language === "css" || language === "javascript" ? (
              <iframe
                id="outputFrame"
                title="output"
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-[300px] border rounded-md bg-white"
              ></iframe>
            ) : (
              <pre className="bg-gray-900 text-green-400 p-4 rounded-md overflow-auto min-h-[150px]">
                {output || "Your output will appear here..."}
              </pre>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default CodeEditor;
