import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import { assets } from "../../assets/assets";

const PreferenceModal = ({ onClose }) => {
  const { backendUrl, getToken, setUserData, userData } = useContext(AppContext);

  const [topics, setTopics] = useState([]);
  const [difficulty, setDifficulty] = useState("");
  const [goals, setGoals] = useState([]);

  // ✅ Pre-fill with existing preferences
  useEffect(() => {
    if (userData?.preferences) {
      setTopics(userData.preferences.topics || []);
      setDifficulty(userData.preferences.difficulty || "");
      setGoals(userData.preferences.goals || []);
    }
  }, [userData]);

  // ✅ Check if updating
  const isUpdating =
    (userData?.preferences?.topics?.length > 0 ||
      userData?.preferences?.difficulty ||
      userData?.preferences?.goals?.length > 0);

  const savePreferences = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.put(
        backendUrl + "/api/user/preferences",
        { topics, difficulty, goals },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(isUpdating ? "Preferences updated!" : "Preferences saved!");
        setUserData(data.user);
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-50 px-4 ">
      <div className="bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl w-full max-w-md md:max-w-lg text-left relative overflow-hidden p-5 md:p-6 rounded-b-xl">
        
        {/* Header */}
        <h2 className="text-lg md:text-xl font-semibold text-white px-6 py-4 text-center">
          {isUpdating ? "Update Your Learning Preferences" : "Set Your Learning Preferences"}
        </h2>

        {/* Topics */}
        <label className="text-white block mb-2 text-sm font-medium text-gray-700">
          Topics
        </label>
        <select
          className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-black mb-2 text-sm md:text-base"
          onChange={(e) => {
            const value = e.target.value;
            if (value && !topics.includes(value)) {
              setTopics([...topics, value]);
            }
            e.target.value = ""; // reset after selection
          }}
        >
          <option value="">Select a topic...</option>
          {assets.topics?.map((topic, i) => (
            <option key={i} value={topic}>
              {topic}
            </option>
          ))}
        </select>

        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 max-h-24 overflow-y-auto p-2 border rounded-xl bg-gray-50">
            {topics.map((topic, i) => (
              <div
                key={i}
                className="flex items-center bg-cyan-100 text-cyan-800 border border-cyan-300 px-3 py-1 rounded-full shadow-sm text-xs md:text-sm"
              >
                <span className="mr-2">{topic}</span>
                <button
                  className="text-cyan-600 hover:text-red-500 font-bold"
                  onClick={() => setTopics(topics.filter((t) => t !== topic))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Difficulty */}
        <label className="text-white block mt-4 mb-2 text-sm font-medium text-gray-700">
          Difficulty
        </label>
        <select
          value={difficulty}
          className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-black mb-2 text-sm md:text-base"
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="">Select...</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        {/* Goals */}
        <label className="text-white block mt-4 mb-2 text-sm font-medium text-gray-700">
          Goals
        </label>
        <select
          className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-black mb-2 text-sm md:text-base"
          onChange={(e) => {
            const value = e.target.value;
            if (value && !goals.includes(value)) {
              setGoals([...goals, value]);
            }
            e.target.value = ""; // reset after selection
          }}
        >
          <option value="">Select a goal...</option>
          {assets.goals?.map((goal, i) => (
            <option key={i} value={goal}>
              {goal}
            </option>
          ))}
        </select>

        {goals.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 max-h-24 overflow-y-auto p-2 border rounded-xl bg-gray-50">
            {goals.map((goal, i) => (
              <div
                key={i}
                className="flex items-center bg-cyan-100 text-cyan-800 border border-cyan-300 px-3 py-1 rounded-full shadow-sm text-xs md:text-sm"
              >
                <span className="mr-2">{goal}</span>
                <button
                  className="text-cyan-600 hover:text-red-500 font-bold"
                  onClick={() => setGoals(goals.filter((g) => g !== goal))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end mt-6 gap-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium shadow hover:bg-gray-300 transition text-sm md:text-base"
          >
            Close
          </button>
          <button
            onClick={savePreferences}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium shadow hover:opacity-90 transition text-sm md:text-base"
          >
            {isUpdating ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreferenceModal;
