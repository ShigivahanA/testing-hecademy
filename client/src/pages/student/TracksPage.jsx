import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { learningTracks } from "../../assets/assets";
import CourseCard from "../../components/student/CourseCard";
import Footer from "../../components/student/Footer";
import Loading from "../../components/student/Loading";

const TracksPage = () => {
  const { allCourses, loadingUser, navigate } = useContext(AppContext);
  const [trackCourses, setTrackCourses] = useState({});
  const [pageLoading, setPageLoading] = useState(true);

  // 🧭 Page intro loader (2 seconds)
  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => setPageLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // 🧠 Strict Tag Matching for Tracks
  useEffect(() => {
    if (allCourses?.length) {
      const grouped = {};

      learningTracks.forEach((track) => {
        const trackTags = track.tags.map((t) =>
          t.toLowerCase().trim().replace(/[^a-z0-9+]/g, "")
        );

        const matched = allCourses.filter(
          (course) =>
            Array.isArray(course.tags) &&
            course.tags.some((tag) =>
              trackTags.includes(
                tag.toLowerCase().trim().replace(/[^a-z0-9+]/g, "")
              )
            )
        );

        grouped[track.id] = matched;
      });

      setTrackCourses(grouped);
    }
  }, [allCourses]);

  if (loadingUser || pageLoading) {
    return <Loading />;
  }

  return (
    <>
      <div className="relative md:px-36 px-8 pt-20 text-left bg-gradient-to-b from-cyan-100/70 via-white to-white min-h-screen">
        {/* ===== Header ===== */}
        <div className="flex md:flex-row flex-col gap-6 items-start justify-between w-full mb-10">
          <div>
            <h1 className="text-4xl font-semibold text-gray-800">
              Learning Tracks
            </h1>
            <p className="text-gray-500">
              <span
                onClick={() => navigate("/")}
                className="hover:text-blue-600 cursor-pointer"
              >
                Home
              </span>{" "}
              /{" "}
              <span
                onClick={() => navigate("/tracks")}
                className="hover:text-blue-600 cursor-pointer"
              >
                Learning Tracks
              </span>
            </p>
          </div>
        </div>

        {/* ===== Tracks Section ===== */}
        {learningTracks.map((track) => {
          const courses = trackCourses[track.id] || [];
          if (!courses.length) return null;

          const visibleCourses = courses.slice(0, 4); // 👈 show only 4
          const extraCount = courses.length - visibleCourses.length;

          return (
            <div
              key={track.id}
              className="mb-16 pb-10 border-b border-gray-200 last:border-none"
            >
              {/* Track Header */}
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-semibold text-gray-800" >
                  {track.title}
                </h2>
              </div>
              <p className="text-gray-600 mb-8 max-w-3xl">{track.description}</p>

              {/* Course Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {visibleCourses.map((course) => (
                  <CourseCard key={course._id} course={course} />
                ))}
              </div>
              {extraCount > 0 ? (
                <p
                  onClick={() => navigate(`/tracks/${track.id}`)}
                  className="text-cyan-600 mt-4 cursor-pointer hover:underline text-sm md:text-base"
                >
                  +{extraCount} more course
                  {extraCount > 1 ? "s" : ""} in this track →
                </p>
              ) : (
                <p
                  onClick={() => navigate(`/tracks/${track.id}`)}
                  className="text-cyan-600 mt-4 cursor-pointer hover:underline text-sm md:text-base"
                >
                  Explore the track →
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Footer />
    </>
  );
};

export default TracksPage;
