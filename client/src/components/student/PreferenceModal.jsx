import React, { useState, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";

const PreferenceModal = ({ onClose }) => {
  const { backendUrl, getToken, setUserData } = useContext(AppContext);

  const [topics, setTopics] = useState([]);
  const [difficulty, setDifficulty] = useState("");
  const [goals, setGoals] = useState([]);

  const savePreferences = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.put(
        backendUrl + "/api/user/preferences",
        { topics, difficulty, goals },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success("Preferences saved!");
        setUserData(data.user); // update context
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg text-left relative">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Set Your Learning Preferences
        </h2>

        {/* Topics */}
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Topics (comma separated)
        </label>
        <input
          type="text"
          className="w-full border p-2 mb-4 rounded focus:ring-2 focus:ring-blue-400"
          placeholder="e.g. React, Python, UI/UX"
          onChange={(e) =>
            setTopics(e.target.value.split(",").map((t) => t.trim()))
          }
        />

        {/* Difficulty */}
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Difficulty
        </label>
        <select
          className="w-full border p-2 mb-4 rounded focus:ring-2 focus:ring-blue-400"
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="">Select...</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        {/* Goals */}
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Goals (comma separated)
        </label>
        <input
          type="text"
          className="w-full border p-2 mb-6 rounded focus:ring-2 focus:ring-blue-400"
          placeholder="e.g. Career growth, Exam prep, Hobby learning"
          onChange={(e) =>
            setGoals(e.target.value.split(",").map((g) => g.trim()))
          }
        />

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Skip
          </button>
          <button
            onClick={savePreferences}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreferenceModal;
