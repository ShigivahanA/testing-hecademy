import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import Footer from "../../components/student/Footer";
import { toast } from "react-toastify";
import axios from "axios";
import Loading from "../../components/student/Loading";
import CourseCard from "../../components/student/CourseCard";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = ["#2563EB", "#16A34A", "#FACC15", "#EF4444"];

const StudentDashboard = () => {
  const {
    userData,
    enrolledCourses,
    certificates,
    getToken,
    backendUrl,
    calculateCourseDuration,
    calculateNoOfLectures,
    allCourses,
    recommendations,
    fetchRecommendations,
  } = useContext(AppContext);

  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [dailyStreakData, setDailyStreakData] = useState([]);
  const [streakCount, setStreakCount] = useState(0);

  // ✅ Fetch Progress Data
  const getProgress = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const temp = await Promise.all(
        enrolledCourses.map(async (course) => {
          const { data } = await axios.post(
            `${backendUrl}/api/user/get-course-progress`,
            { courseId: course._id },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const total = calculateNoOfLectures(course);
          const completed = data.progressData
            ? data.progressData.lectureCompleted.length
            : 0;

          // ✅ Add watch time info (durationMinutes & updatedAt)
          const totalMinutesWatched =
            data.progressData?.totalMinutesWatched || 0;

          return {
            courseId: course._id,
            courseTitle: course.courseTitle,
            category: course.category || "General",
            total,
            completed,
            duration: calculateCourseDuration(course),
            progressPercent:
              total > 0 ? Math.round((completed / total) * 100) : 0,
            lastUpdated: data.progressData?.updatedAt || course.updatedAt,
            minutesWatched: totalMinutesWatched,
          };
        })
      );

      setProgressData(temp);
      suggestCourses(temp);
      generateConsecutiveStreak(temp);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Recommend Courses Locally (based on most frequent category)
  const suggestCourses = (progressList) => {
    if (!progressList.length || !allCourses.length) return;

    const topCategory = progressList
      .map((c) => c.category)
      .sort(
        (a, b) =>
          progressList.filter((x) => x.category === a).length -
          progressList.filter((x) => x.category === b).length
      )
      .pop();

    const recommended = allCourses
      .filter(
        (c) =>
          c.category === topCategory &&
          !enrolledCourses.some((ec) => ec._id === c._id)
      )
      .slice(0, 3);

    setRecommendedCourses(recommended);
  };

  // ✅ Generate Daily Streak (7 days visualization)
  // ✅ Generate streak and actual daily learning hours from lectureCompleted[]
const generateConsecutiveStreak = async (progressList) => {
  try {
    const token = await getToken();
    if (!token) return;

    // Step 1️⃣: Fetch detailed course progress for each enrolled course
    const allProgress = await Promise.all(
      enrolledCourses.map(async (course) => {
        const { data } = await axios.post(
          `${backendUrl}/api/user/get-course-progress`,
          { courseId: course._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return data.progressData;
      })
    );

    // Step 2️⃣: Build a map { YYYY-MM-DD: totalMinutes }
    const dailyMap = {};

    allProgress.forEach((progress) => {
      if (!progress || !progress.lectureCompleted) return;

      progress.lectureCompleted.forEach((lec) => {
        if (!lec.completedAt || lec.duration == null) return;
        const day = new Date(lec.completedAt).toISOString().split("T")[0];
        if (!dailyMap[day]) dailyMap[day] = 0;
        dailyMap[day] += lec.duration; // duration is in minutes
      });
    });

    // Step 3️⃣: Build data for last 7 days
    const today = new Date();
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      const minutes = dailyMap[key] || 0;
      const hours = minutes / 60;

      last7Days.push({ day: label, Hours: Number(hours.toFixed(1)) });
    }

    // Step 4️⃣: Update chart data
    setDailyStreakData(last7Days);

    // Step 5️⃣: Calculate streak (continuous nonzero days)
    let streak = 0;
    for (let i = last7Days.length - 1; i >= 0; i--) {
      if (last7Days[i].Hours > 0) streak++;
      else break;
    }
    setStreakCount(streak);
  } catch (err) {
    console.error("❌ generateConsecutiveStreak error:", err);
  }
};

  useEffect(() => {
    if (userData === null) {
      setLoading(false);
      return;
    }

    if (userData) {
      if (enrolledCourses.length > 0) {
        getProgress();
      } else {
        setLoading(false);
      }
      fetchRecommendations();
    }
  }, [userData, enrolledCourses]);

  if (loading) return <Loading />;

  if (!userData) {
    return (
      <>
        <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 text-gray-600 px-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-semibold mb-3 text-gray-800">
              Dashboard
            </h1>
            <p className="text-gray-500 mb-6">
              Please log in to view your dashboard and analytics.
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

  // ✅ Derived Stats
  const totalCourses = enrolledCourses.length;
  const completedCourses = progressData.filter(
    (p) => p.completed === p.total
  ).length;
  const totalCerts = certificates?.length || 0;
  const totalLectures = progressData.reduce((sum, c) => sum + c.total, 0);
  const avgCompletionRate =
    progressData.length > 0
      ? Math.round(
          progressData.reduce((sum, c) => sum + c.progressPercent, 0) /
            progressData.length
        )
      : 0;

  const pieData = [
    { name: "Completed", value: completedCourses },
    { name: "Ongoing", value: totalCourses - completedCourses },
  ];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-gray-50 py-10 px-6 lg:px-36 transition-all">
        <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 lg:p-10 border border-gray-100 space-y-10">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Dashboard
            </h1>
            <p className="text-gray-500 text-sm">
              Welcome back, {userData?.name || "Student"} — here’s your learning
              summary.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <InsightCard
              title="Total Courses"
              value={totalCourses}
              color="bg-blue-100"
            />
            <InsightCard
              title="Completed Courses"
              value={completedCourses}
              color="bg-green-100"
            />
            <InsightCard
              title="Certificates"
              value={totalCerts}
              color="bg-yellow-100"
            />
            <InsightCard
              title="Average Completion"
              value={`${avgCompletionRate}%`}
              color="bg-cyan-100"
            />
            <InsightCard
              title="Total Lectures"
              value={totalLectures}
              color="bg-purple-100"
            />
            <InsightCard
              title="Current Streak"
              value={`${streakCount} ${streakCount === 1 ? "day" : "days"}`}
              color="bg-red-100"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Completion Pie */}
            <div className="bg-gray-50 rounded-xl p-6 shadow-inner border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Completion Overview
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Daily Streak */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Daily Learning Hours
              </h2>

              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={dailyStreakData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  style={{ backgroundColor: "transparent" }}
                >
                  <CartesianGrid stroke="#f0f0f0" vertical={false} />

                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: "#4B5563" }}
                    axisLine={{ stroke: "#E5E7EB" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#4B5563" }}
                    label={{
                      value: "Hours",
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle", fill: "#4B5563", fontSize: 12 },
                    }}
                    domain={[0, "auto"]}
                    allowDecimals={false}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                  />

                  <Tooltip
                    formatter={(value) => `${value} hrs`}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      color: "#2563EB",
                    }}
                    cursor={{ fill: "transparent" }} // ✅ This line removes the gray hover bar
                  />

                  <Bar
                    dataKey="Hours"
                    fill="#2563EB"
                    radius={[8, 8, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-sm text-gray-500 text-center mt-3">
                Keep your streak alive — missing a day resets your progress!
              </p>
            </div>
          </div>
          {/* Recommendations */}
          {(recommendations.length > 0 ? recommendations : recommendedCourses)
            .slice(0, 3)
            .length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Recommended for You
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(recommendations.length > 0
                  ? recommendations
                  : recommendedCourses
                )
                  .slice(0, 3)
                  .map((course) => (
                    <CourseCard key={course._id} course={course} />
                  ))}
              </div>
            </div>
          )}
                    {/* CTA */}
          <div className="mt-10 text-center flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="/my-enrollments"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              View My Enrollments
            </a>
            <a
              href="/leaderboard"
              className="inline-block px-6 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition"
            >
              View Leaderboard
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

// Reusable Card
const InsightCard = ({ title, value, color }) => (
  <div
    className={`p-5 rounded-xl shadow-md border border-gray-100 ${color} hover:shadow-lg transition`}
  >
    <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-semibold text-gray-800 mt-1">{value}</p>
  </div>
);

export default StudentDashboard;
