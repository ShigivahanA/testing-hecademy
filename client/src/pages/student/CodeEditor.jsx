// client/src/pages/student/CodeEditor.jsx
import React, { useState, useContext, useEffect } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import Footer from "../../components/student/Footer";
import { toast } from "react-toastify";
import { useUser } from "@clerk/clerk-react";
import { AppContext } from "../../context/AppContext";

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

  const { backendUrl, getToken, navigate } = useContext(AppContext);
  const { user, isLoaded } = useUser();

  // Redirect unauthenticated users
  useEffect(() => {
    if (isLoaded && !user) {
      navigate("/");
    }
  }, [isLoaded, user, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50 text-gray-500">
        Loading Code Editor...
      </div>
    );
  }

  const handleRunCode = async () => {
    setLoading(true);
    setOutput("");

    try {
      if (["html", "css", "javascript"].includes(language)) {
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

      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/code/run`,
        { language, code },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOutput(data.success ? data.output : `Error: ${data.error}`);
    } catch (err) {
      toast.error("Error running code");
      setOutput(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-600">
        <h1 className="text-2xl font-semibold mb-4">
          Please sign in to use the Code Editor
        </h1>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-gray-50 py-10 px-6 lg:px-36 transition-all">
        <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 lg:p-10 border border-gray-100">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              Code Editor
            </h1>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium bg-gray-50 hover:bg-gray-100 transition"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Editor Section */}
          <div className="rounded-lg overflow-hidden border border-gray-200 shadow-inner">
            <Editor
              height="55vh"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
              }}
            />
          </div>

          {/* Run Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={handleRunCode}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 font-medium"
            >
              {loading ? "Running..." : "Run Code"}
            </button>
          </div>

          {/* Output */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span>Output</span>
              <span className="text-gray-400 text-sm font-normal">
                ({language.toUpperCase()})
              </span>
            </h2>

            {["html", "css", "javascript"].includes(language) ? (
              <div className="border border-gray-200 rounded-lg bg-gray-100 shadow-inner overflow-hidden">
                <iframe
                  id="outputFrame"
                  title="Output Preview"
                  sandbox="allow-scripts allow-same-origin"
                  className="w-full h-[350px] bg-white rounded-lg"
                ></iframe>
              </div>
            ) : (
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 sm:p-6 text-sm font-mono overflow-auto border border-gray-800 min-h-[200px] shadow-inner">
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
