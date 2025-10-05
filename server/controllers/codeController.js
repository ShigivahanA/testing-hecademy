// server/controllers/codeController.js
import axios from "axios";

export const runCode = async (req, res) => {
  try {
    const { language, code } = req.body;

    if (!language || !code) {
      return res.status(400).json({ success: false, error: "Language or code missing" });
    }

    // ✅ Map frontend language names to Piston language identifiers
    const langMap = {
      python: "python3",
      java: "java",
      javascript: "javascript",
    };

    const pistonLang = langMap[language] || language;

    const { data } = await axios.post("https://emkc.org/api/v2/piston/execute", {
      language: pistonLang,
      version: "*",
      files: [{ content: code }],
    });

    res.json({
      success: true,
      output: data.run.output || "",
    });
  } catch (error) {
    console.error("Code Execution Error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Error executing code",
    });
  }
};

// ✅ Controller added for code execution using Piston API
