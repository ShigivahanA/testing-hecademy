import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import { learningTracks } from "../../assets/assets";
import Footer from "../../components/student/Footer";
import Loading from "../../components/student/Loading";
import { Line } from "rc-progress";
import { ArrowLeft, Trophy, BookOpen, Target } from "lucide-react";

const TrackDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { allCourses, userData, loadingUser } = useContext(AppContext);

  const [track, setTrack] = useState(null);
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);

  // 🧭 Page intro loader
  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => setPageLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // 🎯 Match & order courses
  useEffect(() => {
    const selectedTrack = learningTracks.find((t) => t.id === id);
    if (selectedTrack) {
      setTrack(selectedTrack);

      // Strict tag match
      const matched = allCourses.filter(
        (course) =>
          Array.isArray(course.tags) &&
          course.tags.some((tag) =>
            selectedTrack.tags
              .map((t) => t.toLowerCase().trim().replace(/[^a-z0-9+]/g, ""))
              .includes(tag.toLowerCase().trim().replace(/[^a-z0-9+]/g, ""))
          )
      );

      // Difficulty order
      const ordered = matched.sort((a, b) => {
        const order = ["beginner", "intermediate", "advanced"];
        return order.indexOf(a.difficulty) - order.indexOf(b.difficulty);
      });

      setCourses(ordered);

      // Progress calc
      if (userData?.enrolledCourses?.length) {
        const enrolled = matched.filter((c) =>
          userData.enrolledCourses.includes(c._id)
        ).length;
        setProgress(Math.round((enrolled / matched.length) * 100));
      }
    }
  }, [id, allCourses, userData]);

  if (loadingUser || pageLoading || !track) return <Loading />;

  return (
    <>
      <div className="relative min-h-screen bg-white">
        {/* === Top Gradient Header === */}
        <div className="absolute inset-x-0 top-0 h-[40vh] bg-gradient-to-b from-cyan-100/70 via-white to-transparent" />

        <div className="relative z-10 max-w-6xl mx-auto pt-20 px-5 md:px-12 pb-20">
          {/* === Back Button (mobile only) === */}
          <button
            onClick={() => navigate("/tracks")}
            className="flex items-center gap-2 text-gray-500 hover:text-cyan-700 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tracks
          </button>

          {/* === Header Info === */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="text-5xl md:text-6xl">{track.icon}</div>
              <div>
                <h1 className="text-3xl md:text-5xl font-bold text-gray-800 tracking-tight">
                  {track.title}
                </h1>
                <p className="text-gray-600 text-sm md:text-base mt-2 md:mt-3 leading-relaxed max-w-2xl">
                  {track.description}
                </p>
              </div>
            </div>

            {/* === Stats === */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              {[
                {
                  icon: <BookOpen className="text-cyan-600 w-5 h-5" />,
                  label: "Courses",
                  value: courses.length,
                },
                {
                  icon: <Trophy className="text-yellow-500 w-5 h-5" />,
                  label: "Progress",
                  value: `${progress}%`,
                },
                {
                  icon: <Target className="text-green-600 w-5 h-5" />,
                  label: "Level",
                  value: courses.length ? courses[0].difficulty : "Beginner",
                },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-3 md:px-5 md:py-4 text-center flex flex-col items-center min-w-[80px]"
                >
                  <div className="p-2 bg-gray-50 rounded-full mb-2">
                    {stat.icon}
                  </div>
                  <p className="text-xs md:text-sm text-gray-500">
                    {stat.label}
                  </p>
                  <span className="font-semibold text-gray-800 capitalize text-sm md:text-base">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* === Progress Bar === */}
          {courses.length > 0 && (
            <div className="mt-10 w-full md:w-3/4">
              <div className="flex justify-between text-xs md:text-sm text-gray-500 mb-2">
                <span>Track Progress</span>
                <span>{progress}%</span>
              </div>
              <Line
                percent={progress}
                strokeWidth="2"
                strokeColor="#06b6d4"
                trailColor="#e5e7eb"
                strokeLinecap="round"
              />
            </div>
          )}

          {/* === Learning Path === */}
          <div className="mt-16">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-10">
              Learning Path
            </h2>

            {/* === Mobile View (Vertical) === */}
            <div className="md:hidden flex flex-col items-center gap-10">
              {courses.length > 0 ? (
                courses.map((course, index) => (
                  <div key={course._id} className="flex flex-col items-center gap-3">
                    <p className="font-semibold text-cyan-700 text-sm">
                      Course {index + 1}
                    </p>
                    <SimpleCourseCard course={course} />
                    {index !== courses.length - 1 && (
                      <div className="w-1 h-14 bg-gradient-to-b from-cyan-300 to-cyan-500 rounded-full my-3" />
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center text-sm">
                  No courses available for this track yet.
                </p>
              )}
            </div>

            {/* === Desktop Zig-Zag Timeline === */}
            <div className="hidden md:flex flex-col items-center relative">
              <div className="absolute left-1/2 top-0 h-full w-[3px] bg-gradient-to-b from-cyan-300 to-cyan-500 rounded-full"></div>

              {courses.map((course, index) => (
                <div
                  key={course._id}
                  className={`relative w-full flex items-center justify-between mb-24 ${
                    index % 2 === 0 ? "flex-row" : "flex-row-reverse"
                  }`}
                >
                  {/* Connector */}
                  <div
                    className={`md:hidden absolute ${
                      index % 2 === 0 ? "left-1/2" : "right-1/2"
                    } top-1/2 w-[2px] h-16 bg-gradient-to-b from-cyan-300 to-cyan-500 -translate-y-1/2`}
                  />
                  {/* Step & Card */}
                  <div
                    className={`w-5/12 ${
                      index % 2 !== 0 ? "text-right" : ""
                    } relative`}
                  >
                    <span className="text-cyan-600 font-semibold text-sm block mb-3">
                      Step {index + 1}
                    </span>
                    <SimpleCourseCard course={course} />
                  </div>

                  <div className="relative z-10 w-5 h-5 bg-cyan-500 rounded-full shadow-md border-4 border-white" />
                  <div className="w-5/12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

// ✅ Minimal inline course card for this page
const SimpleCourseCard = ({ course }) => {
  const navigate = useNavigate();
  const { enrolledCourses } = useContext(AppContext);
  const getCourseId = (id) => {
    if (!id) return ''
    if (typeof id === 'string') return id
    if (id.$oid) return id.$oid
    if (id.toString) return id.toString()
    if (id.buffer && id.buffer.data) return String(id.buffer.data.join(''))
    return String(id)
  }
    const courseId = getCourseId(course._id)

  const isEnrolled = enrolledCourses?.some(
    (enrolled) => getCourseId(enrolled._id) === courseId
  )

  return (
    <div
      onClick={() => {
        scrollTo(0, 0);
        navigate(`/course/${course._id}`);
      }}
      className="bg-white relative border border-gray-500/30 pb-6 overflow-hidden rounded-xl hover:bg-gradient-to-b from-cyan-100/70 shadow-md transform transition-transform duration-300 hover:scale-105"
    >
      <img
        src={course.courseThumbnail}
        alt={course.courseTitle}
        className="w-full h-full object-cover"
      />
      {isEnrolled && (
        <div className="absolute top-2 right-2 bg-black text-white text-xs font-semibold px-2 py-1 rounded-md shadow-sm">
          Enrolled
        </div>
      )}
      <div className="p-4">
        <h3 className="text-gray-800 font-semibold text-base leading-snug transition-colors">
          {course.courseTitle}
        </h3>
      </div>
    </div>
  );
};

export default TrackDetail;
