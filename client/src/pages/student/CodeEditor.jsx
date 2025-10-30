import React, { useState, useContext, useEffect } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import Footer from "../../components/student/Footer";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";

const languages = [
  { label: "Front-End (HTML, CSS, JS)", value: "frontend" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
];

const CodeEditor = () => {
  const [language, setLanguage] = useState("frontend");
    const [htmlCode, setHtmlCode] = useState(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My First Project</title>

    <!-- Link your CSS file -->
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <header>
      <h1>Welcome to My Website</h1>
      <p>Click the button below to change the heading color.</p>
    </header>

    <main>
      <button id="colorBtn">Change Color</button>
    </main>

    <!-- Link your JS file -->
    <script src="script.js"></script>
  </body>
</html>
`);

  const [cssCode, setCssCode] = useState(
`* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Body styling */
body {
  font-family: Arial, sans-serif;
  background-color: #f3f4f6;
  color: #111827;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

/* Header styles */
h1 {
  color: #2563eb;
  transition: color 0.3s;
  text-align: center;
}

p {
  margin: 10px 0 20px;
  font-size: 18px;
}

/* Button styles */
button {
  background-color: #2563eb;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.3s;
}

button:hover {
  background-color: #1d4ed8;
}`);

  const [jsCode, setJsCode] = useState(
`document.addEventListener("DOMContentLoaded", () => {
  const heading = document.querySelector("h1");
  const button = document.getElementById("colorBtn");

  button.addEventListener("click", () => {
    heading.style.color =
      heading.style.color === "crimson" ? "#2563eb" : "crimson";
  });

  console.log("JavaScript connected successfully ✅");
});`);

  const [backendCode, setBackendCode] = useState("");
  const [output, setOutput] = useState("");
  const [activeTab, setActiveTab] = useState("html");
  const [loading, setLoading] = useState(false);

  const { backendUrl, getToken, userData } = useContext(AppContext);


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle running the code
  const handleRunCode = async () => {
    setLoading(true);
    setOutput("");

    try {
      if (language === "frontend") {
        const html = `
          <html>
            <head>
              <style>${cssCode}</style>
            </head>
            <body>
              ${htmlCode}
              <script>${jsCode}</script>
            </body>
          </html>
        `;
        const iframe = document.getElementById("outputFrame");
        iframe.srcdoc = html;
        setLoading(false);
        return;
      }

      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/code/run`,
        { language, code: backendCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOutput(data.success ? data.output : `Error: ${data.error}`);
    } catch (err) {
      console.error(err);
      toast.error("Error running code");
      setOutput(err.message);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
  // Fix Monaco suggestion box z-index issue
  const style = document.createElement("style");
  style.innerHTML = `
    .monaco-editor .suggest-widget {
      z-index: 9999 !important;
    }
  `;
  document.head.appendChild(style);
  return () => document.head.removeChild(style);
}, []);


  // If user is not logged in
if (!userData) {
  return (
    <>
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-cyan-100/70 via-white to-white text-gray-600 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-3 text-gray-800">
            Code Editor
          </h1>
          <p className="text-gray-500 mb-6">
            Please log in to use the Code Editor and run your code securely.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Go to Home
          </a>
        </div>
      </div>
      <Footer />
    </>
  );
}

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-cyan-100/70 via-white to-white py-10 px-6 lg:px-36 transition-all">
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

          {/* FRONTEND: HTML, CSS, JS Tabs */}
          {language === "frontend" ? (
            <div className="space-y-6">
              <div className="flex gap-2 mb-2">
                {["html", "css", "js"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-all ${
                      activeTab === tab
                        ? "border-blue-600 text-blue-600 bg-gray-100"
                        : "border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-gray-200 shadow-inner relative overflow-visible">
                {activeTab === "html" && (
                  <Editor
                    height="55vh"
                    language="html"
                    theme="vs-dark"
                    value={htmlCode}
                    onChange={(value) => setHtmlCode(value || "")}
                  />
                )}
                {activeTab === "css" && (
                  <Editor
                    height="55vh"
                    language="css"
                    theme="vs-dark"
                    value={cssCode}
                    onChange={(value) => setCssCode(value || "")}
                  />
                )}
                {activeTab === "js" && (
                  <Editor
                    height="55vh"
                    language="javascript"
                    theme="vs-dark"
                    value={jsCode}
                    onChange={(value) => setJsCode(value || "")}
                  />
                )}
              </div>
            </div>
          ) : (
            // BACKEND: Python or Java
            <div className="rounded-lg overflow-hidden border border-gray-200 shadow-inner">
              <Editor
                height="55vh"
                language={language}
                theme="vs-dark"
                value={backendCode}
                onChange={(value) => setBackendCode(value || "")}
              />
            </div>
          )}

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
                ({language === "frontend" ? "Static Page" : language.toUpperCase()})
              </span>
            </h2>

            {language === "frontend" ? (
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

      <Footer />
    </>
  );
};

export default CodeEditor;
