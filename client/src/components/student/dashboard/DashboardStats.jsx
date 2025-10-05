import React from "react";

const DashboardStats = ({ stats }) => {
  const cards = [
    {
      label: "Enrolled Courses",
      value: stats.totalCourses || 0,
      color: "bg-blue-100 text-blue-800",
    },
    {
      label: "Completed Courses",
      value: stats.completedCourses || 0,
      color: "bg-green-100 text-green-800",
    },
    {
      label: "Certificates Earned",
      value: stats.totalCerts || 0,
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      label: "Total Lectures",
      value: stats.totalLectures || 0,
      color: "bg-purple-100 text-purple-800",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl shadow-md p-5 border border-gray-100 ${card.color}`}
        >
          <p className="text-sm font-medium">{card.label}</p>
          <h3 className="text-3xl font-bold mt-2">{card.value}</h3>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
