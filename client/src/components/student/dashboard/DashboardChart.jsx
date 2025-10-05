import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const DashboardChart = ({ data }) => {
  const formattedData = data.map((item) => ({
    name: item.courseTitle.length > 15 ? item.courseTitle.slice(0, 15) + "…" : item.courseTitle,
    progress: item.total ? Math.round((item.completed / item.total) * 100) : 0,
  }));

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-inner p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Course Progress Overview
      </h2>
      {formattedData.length === 0 ? (
        <p className="text-gray-500 text-center py-10">
          No course data available.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fill: "#6b7280", fontSize: 12 }}
            />
            <Tooltip />
            <Bar dataKey="progress" fill="#2563eb" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default DashboardChart;
