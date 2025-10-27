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
      const res = await axios.get(
        `${backendUrl}/api/educator/feedback-sentiment`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

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
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mt-4 w-full max-w-7xl mx-auto">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 text-center md:text-left">
        Students Satisfaction Overview
      </h2>

      {data.length === 0 ? (
        <p className="text-gray-500 text-center sm:text-left text-sm">
          No feedback available yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {data.map((course, i) => {
            const chartData = [
              { name: "Positive", value: course.positive },
              { name: "Neutral", value: course.neutral },
              { name: "Negative", value: course.negative },
            ];

            const total =
              course.positive + course.neutral + course.negative || 1;

            return (
              <div
                key={i}
                className="border rounded-xl p-4 sm:p-5 bg-gray-50 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col items-center justify-between"
              >
                <h3 className="font-medium text-gray-800 mb-3 text-center text-base sm:text-lg">
                  {course.courseTitle}
                </h3>

                {/* Chart */}
                <div className="w-full flex justify-center items-center mb-3">
                  <div className="w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] md:w-[270px] md:h-[270px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius="80%"
                          dataKey="value"
                        >
                          {chartData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Legend (Below Chart) */}
                <div className="flex flex-wrap justify-center gap-3 mb-3 text-sm sm:text-base">
                  {chartData.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[idx] }}
                      />
                      <span className="text-gray-700">
                        {entry.name}{" "}
                        <span className="font-semibold text-gray-900">
                          {((entry.value / total) * 100).toFixed(0)}%
                        </span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* Avg Sentiment */}
                <p className="text-center text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
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
