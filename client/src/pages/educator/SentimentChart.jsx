import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

const COLORS = ["#22c55e", "#eab308", "#ef4444"]; // green, yellow, red

const SentimentChart = () => {
  const { backendUrl, getToken } = useContext(AppContext);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSentimentData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get(`${backendUrl}/api/educator/feedback-sentiment`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) setData(res.data.sentimentStats);
      else toast.error("Failed to load sentiment data");
    } catch (err) {
      toast.error("Error fetching sentiment data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentimentData();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-40 text-gray-600">
        <Loader2 className="animate-spin mr-2" /> Analyzing feedback...
      </div>
    );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Student Satisfaction Overview
      </h2>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No feedback available yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.map((course, i) => {
            const chartData = [
              { name: "Positive", value: course.positive },
              { name: "Neutral", value: course.neutral },
              { name: "Negative", value: course.negative },
            ];

            return (
              <div key={i} className="border rounded p-4 bg-gray-50">
                <h3 className="font-medium text-gray-800 mb-3">
                  {course.courseTitle}
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-center text-sm text-gray-600 mt-2">
                  Avg Sentiment:{" "}
                  <span
                    className={`font-semibold ${
                      course.satisfaction === "Positive"
                        ? "text-green-600"
                        : course.satisfaction === "Negative"
                        ? "text-red-500"
                        : "text-yellow-600"
                    }`}
                  >
                    {course.satisfaction}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SentimentChart;
