import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { learningTracks } from "../../assets/assets"; // same file you used before
import CourseCard from "./CourseCard";
import { Link } from "react-router-dom";

const TracksSection = () => {
  const { allCourses } = useContext(AppContext);
  const [trackCourses, setTrackCourses] = useState({});

  useEffect(() => {
    if (allCourses.length) {
      const grouped = {};
      learningTracks.forEach((track) => {
        const matched = allCourses.filter((course) =>
          course.tags?.some((tag) => {
            const normalizedTag = tag.toLowerCase().replace(/[^a-z0-9]/g, "");
            return track.tags.some((t) => {
              const normalizedTrack = t.toLowerCase().replace(/[^a-z0-9]/g, "");
              return (
                normalizedTag.includes(normalizedTrack) ||
                normalizedTrack.includes(normalizedTag)
              );
            });
          })
        );
        grouped[track.id] = matched;
      });
      setTrackCourses(grouped);
    }
  }, [allCourses]);

  return (
    <div className="py-16 md:px-40 px-8 bg-white">
      {/* Heading */}
      <div className="text-center max-w-3xl mx-auto">
  <h2 className="text-3xl font-medium text-gray-800">
    Explore Career-Oriented Learning Tracks
  </h2>
  <p className="md:text-base text-sm text-gray-500 mt-3">
    Advance your skills step-by-step with curated course paths — from
    beginner to expert. Each track is designed to prepare you for your dream
    role in tech, design, business, or data.
  </p>
</div>
      {/* Tracks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:my-16 my-10">
        {learningTracks.slice(0, 3).map((track) => {
          const courses = trackCourses[track.id] || [];
          if (!courses.length) return null;

          return (
            <div
              key={track.id}
              className="border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-lg hover:bg-gradient-to-b from-cyan-100/70 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{track.icon}</span>
                <h3 className="text-xl font-semibold text-gray-800">
                  {track.title}
                </h3>
              </div>
              <p className="text-gray-600 mb-6">{track.description}</p>

              {/* Track footer */}
              <div className="mt-6 flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {courses.length} courses available
                </p>
                <Link
                  to={`/tracks/${track.id}`}
                  onClick={() => scrollTo(0, 0)}
                  className="text-cyan-600 font-medium text-sm"
                >
                  View Track →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Tracks */}
      <div className="text-center mt-10">
        <Link
          to="/tracks"
          onClick={() => scrollTo(0, 0)}
          className="text-gray-500 border-[0.5px] border-gray-400 hover:-translate-y-1 duration-500 hover:shadow-[4px_4px_0_#000] px-10 py-3 rounded-xl inline-block"
        >
          Show all tracks
        </Link>
      </div>
    </div>
  );
};

export default TracksSection;
