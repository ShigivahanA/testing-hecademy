import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import CourseCard from "../../components/student/CourseCard";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";
import { assets } from "../../assets/assets";
import Navbar from "../../components/student/Navbar";
import Footer from "../../components/student/Footer";

const EducatorCourses = () => {
  const { id } = useParams();
  const { backendUrl } = useContext(AppContext);
  const [educator, setEducator] = useState(null);
  const [courses, setCourses] = useState([]);
  const [sortOption, setSortOption] = useState("ratingHigh");
  const [loading, setLoading] = useState(true);

  // Fetch Educator + Courses
  const fetchEducatorData = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/api/educator/${id}/courses`);
      if (data.success) {
        setEducator(data.educator);
        setCourses(data.courses);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Failed to load educator courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEducatorData();
  }, [id]);

  // Sorting logic
  const sortCourses = (option, courseList) => {
    switch (option) {
      case "ratingHigh":
        return [...courseList].sort((a, b) => b.courseRatings.length - a.courseRatings.length);
      case "ratingLow":
        return [...courseList].sort((a, b) => a.courseRatings.length - b.courseRatings.length);
      case "mostEnrolled":
        return [...courseList].sort((a, b) => b.enrolledStudents.length - a.enrolledStudents.length);
      case "leastEnrolled":
        return [...courseList].sort((a, b) => a.enrolledStudents.length - b.enrolledStudents.length);
      default:
        return courseList;
    }
  };

  const sortedCourses = sortCourses(sortOption, courses);

  // Show loading screen while fetching
  if (loading) return <Loading />;

  return (
    <>
      <Navbar />
      <div className="min-h-screen to-white w-full bg-gradient-to-b from-cyan-100/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-20 pt-20 pb-16">
          {/* Educator Info */}
          {educator && (
            <div className="text-center mb-10 flex flex-col items-center justify-center ">
              <img
                src={educator.imageUrl || assets.profile_icon}
                alt={educator.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-cyan-400 object-cover shadow-md"
              />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold mt-4 text-gray-800">
                {educator.name}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">{educator.email}</p>
            </div>
          )}

          {/* Header + Sort Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-8">
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">
              Courses by {educator?.name}
            </h2>

            {/* Sort Dropdown */}
            <div className="relative w-full sm:w-auto">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 w-full sm:w-56
                           text-sm sm:text-base font-medium text-gray-700 
                           shadow-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 
                           transition-all duration-200 hover:border-cyan-400 cursor-pointer"
              >
                <option value="ratingHigh">Rating: High → Low</option>
                <option value="ratingLow">Rating: Low → High</option>
                <option value="mostEnrolled">Most Enrolled</option>
                <option value="leastEnrolled">Least Enrolled</option>
              </select>

              {/* Custom dropdown arrow */}
              <svg
                className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Course Grid */}
          {sortedCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 md:gap-8">
              {sortedCourses.map((course) => (
                <CourseCard key={course._id} course={course} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-gray-600 text-center text-sm sm:text-base">
                No courses found for this educator.
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default EducatorCourses;
