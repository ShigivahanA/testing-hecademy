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
          const totalMinutesWatched = data.progressData?.lectureCompleted
  ? data.progressData.lectureCompleted.reduce(
      (sum, lec) => sum + (lec.duration || 0),
      0
    )
  : 0;
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
const generateConsecutiveStreak = async (progressList) => {
  // ✅ Helper: get true local date key (YYYY-MM-DD) respecting system timezone
  const getLocalDateKey = (dateInput) => {
    const d = new Date(dateInput);
    return d.toLocaleDateString("en-CA", {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  try {
    const token = await getToken();
    if (!token) return;

    // Step 1️⃣: Fetch detailed progress for each enrolled course
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

        // ✅ Convert to proper local calendar day
        const day = getLocalDateKey(lec.completedAt);

        if (!dailyMap[day]) dailyMap[day] = 0;
        dailyMap[day] += lec.duration; // duration stored in minutes
      });
    });

    // Step 3️⃣: Build data for the last 7 days (today inclusive)
    const today = new Date();
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const key = getLocalDateKey(d); // ✅ Use same helper here too
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      const minutes = dailyMap[key] || 0;
      const hours = minutes / 60;

      last7Days.push({
        day: label,
        date: key,
        Hours: Number(hours.toFixed(1)),
      });
    }

    // Step 4️⃣: Update state with chart data
    setDailyStreakData(last7Days);

    // Step 5️⃣: Calculate streak (continuous nonzero days, skip if today empty)
    let streak = 0;

    for (let i = last7Days.length - 1; i >= 0; i--) {
      const day = last7Days[i];

      // if today (last index) has 0 hours, skip it and continue
      if (i === last7Days.length - 1 && day.Hours === 0) continue;

      if (day.Hours > 0) streak++;
      else break;
    }

    setStreakCount(streak);
  } catch (err) {
    console.error("generateConsecutiveStreak error:", err);
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

    // Monthly Calendar Component (Fixed Layout)
    const LearningCalendar = ({ learnedDates = [], streakCount }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

      // Helper: ensure local timezone-based day key
      const getLocalDateKey = (dateInput) => {
        const d = new Date(dateInput);
        return d.toLocaleDateString("en-CA", {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      };

      // Convert learnedDates into a Set of date strings (YYYY-MM-DD)
      const learnedSet = new Set();
      learnedDates.forEach((d) => {
        if (d.Hours > 0 && d.date) learnedSet.add(d.date);
      });

      // Month info
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const totalDays = new Date(year, month + 1, 0).getDate();

      // Generate grid array
      const daysArray = [];
      for (let i = 0; i < firstDay; i++) daysArray.push(null);

      for (let d = 1; d <= totalDays; d++) {
        // ✅ Local timezone–safe date key (no UTC drift)
        const dateKey = getLocalDateKey(new Date(year, month, d));
        daysArray.push({ day: d, learned: learnedSet.has(dateKey) });
      }

      // Month name and navigation
      const monthName = currentMonth.toLocaleString("default", { month: "long" });
      const changeMonth = (dir) => {
        setCurrentMonth(new Date(year, month + dir, 1));
      };

      return (
        <div className="flex flex-col items-center w-full">
          {/* Header */}
          <div className="flex justify-between items-center w-full mb-3">
            <button
              onClick={() => changeMonth(-1)}
              className="text-gray-500 hover:text-cyan-500 transition transform rotate-180"
            >
              ➜
            </button>
            <div className="text-lg font-semibold text-gray-800">
              {monthName} {year}
            </div>
            <button
              onClick={() => changeMonth(1)}
              className="text-gray-500 hover:text-cyan-500 transition"
            >
              ➜
            </button>
          </div>

          {/* Streak */}
          <p className="text-gray-700 font-medium mb-4">
            Current Streak:{" "}
            <span className="text-cyan-500 font-semibold">
              {streakCount} {streakCount === 1 ? "day" : "days"}
            </span>
          </p>

          {/* Calendar Grid */}
          <div className="w-full max-w-[350px] aspect-square flex flex-col items-center justify-center">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-[4px] w-full mb-1 text-[10px] sm:text-xs text-gray-500 text-center">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-[4px] w-full">
              {daysArray.map((dayObj, idx) =>
                dayObj ? (
                  <div
                    key={idx}
                    className={`flex items-center justify-center text-xs sm:text-sm font-medium rounded-md transition-all ${
                      dayObj.learned
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                    style={{
                      aspectRatio: "1 / 1", // Makes cells perfect squares
                      minHeight: "32px",
                    }}
                  >
                    {dayObj.day}
                  </div>
                ) : (
                  <div
                    key={idx}
                    style={{
                      aspectRatio: "1 / 1",
                      minHeight: "32px",
                    }}
                  />
                )
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
              <span>Learned</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 border rounded-sm"></div>
              <span>Not Learned</span>
            </div>
          </div>
        </div>
      );
    };

  if (loading) return <Loading />;

  if (!userData) {
    return (
      <>
        <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-cyan-100/70 via-white to-white text-gray-600 px-4">
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
      <div className="min-h-screen bg-gradient-to-b from-cyan-100/70 via-white to-white py-10 px-6 lg:px-36 transition-all">
          {/* Header */}
          <div className="mb-8 md:mb-10">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Dashboard
            </h1>
            <p className="text-gray-500 text-sm">
              Welcome back, {userData?.name || "Student"} — here’s your learning
              summary.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 md:mb-14">
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

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 md:mb-16">
            {/* ⏱️ Learning Time Distribution */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-inner flex flex-col h-full min-h-[430px]">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-6 text-center">
                Learning Time Distribution
              </h2>

              <div className="flex-grow flex items-center justify-center">
                {progressData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={progressData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="courseTitle"
                        tick={{
                          fontSize: 8,
                          fill: "#4B5563",
                        }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        tickLine={false}
                        height={60}
                      />
                      <YAxis
                        tick={{
                          fontSize: 9,
                          fill: "#4B5563",
                        }}
                        label={{
                          value: "Minutes Watched",
                          angle: -90,
                          position: "insideLeft",
                          style: {
                            textAnchor: "middle",
                            fill: "#4B5563",
                            fontSize: 10,
                          },
                        }}
                      />
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        formatter={(v) => `${Math.round(v)} minutes`}
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px",
                          color: "#2563EB",
                          fontSize: "0.75rem",
                        }}
                      />
                      <Bar
                        dataKey="minutesWatched"
                        fill="#06b6d4"
                        radius={[6, 6, 0, 0]}
                        barSize={30}
                        isAnimationActive={false}
                        activeBar={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-xs sm:text-sm md:text-base text-center mt-8">
                    No study time data yet. Start watching lectures to see progress!
                  </p>
                )}
              </div>
            </div>

            {/* 🗓️ Learning Calendar */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 flex flex-col h-full min-h-[430px]">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-3 text-center">
                Monthly Learning Calendar
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-4 text-center">
                Missing a day resets your streak!
              </p>

              {/* Stretch calendar evenly */}
              <div className="flex-grow flex items-center justify-center">
                <LearningCalendar
                  learnedDates={dailyStreakData}
                  streakCount={streakCount}
                />
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {(recommendations.length > 0 ? recommendations : recommendedCourses)
            .slice(0, 3)
            .length > 0 && (
            <div className="mb-10 md:mb-16">
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
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:-translate-x-1 duration-500 hover:shadow-[4px_4px_0_#000]"
            >
              View My Enrollments
            </a>
            <a
              href="/leaderboard"
              className="inline-block px-6 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:-translate-x-1 duration-500 hover:shadow-[4px_4px_0_#000]"
            >
              View Leaderboard
            </a>
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
