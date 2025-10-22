import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";

const StudentQuestions = () => {
  const { backendUrl, getToken } = useContext(AppContext);
  const [discussions, setDiscussions] = useState([]);

  const fetchAllQuestions = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/discussion/educator/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setDiscussions(data.discussions);
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchAllQuestions();
  }, []);

  const replyToCourse = async (courseId, message) => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/discussion/add`,
        { courseId, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("Reply posted!");
        fetchAllQuestions();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📩 Student Discussions</h1>
      {discussions.length === 0 && (
        <p className="text-gray-500">No student questions yet.</p>
      )}
      {discussions.map((disc, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">
            {disc.courseId?.courseTitle || "Unknown Course"}
          </h2>
          {disc.thread
            .filter((m) => !m.isEducator)
            .map((msg, i) => (
              <div key={i} className="ml-2 mb-3">
                <p className="text-gray-800 font-medium">{msg.name}:</p>
                <p className="text-gray-600">{msg.message}</p>
              </div>
            ))}

          <input
            type="text"
            placeholder="Type your reply..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full mt-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.value.trim()) {
                replyToCourse(disc.courseId._id, e.target.value);
                e.target.value = "";
              }
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default StudentQuestions;
