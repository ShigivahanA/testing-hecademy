import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import CourseCard from "../../components/student/CourseCard";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";
import { assets } from "../../assets/assets";

const EducatorCourses = () => {
  const { id } = useParams();
  const { backendUrl } = useContext(AppContext);
  const [educator, setEducator] = useState(null);
  const [courses, setCourses] = useState([]);
  const [sortOption, setSortOption] = useState("ratingHigh");
  const [loading, setLoading] = useState(true);

  const fetchEducatorData = async () => {
    try {
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

  if (loading) return <Loading />;

  return (
    <div className="container mx-auto px-6 md:px-12 lg:px-20 xl:px-28 pt-12 pb-20">
      {educator && (
        <div className="text-center mb-10">
          <img
            src={educator.imageUrl || assets.profile_icon}
            alt={educator.name}
            className="w-24 h-24 rounded-full mx-auto border object-cover"
          />
          <h1 className="text-2xl font-semibold mt-4">{educator.name}</h1>
          <p className="text-gray-500">{educator.email}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Courses by {educator?.name}</h2>

        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="border border-gray-300 rounded-md p-2 text-sm"
        >
          <option value="ratingHigh">Rating: High → Low</option>
          <option value="ratingLow">Rating: Low → High</option>
          <option value="mostEnrolled">Most Enrolled</option>
          <option value="leastEnrolled">Least Enrolled</option>
        </select>
      </div>

      {sortedCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCourses.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-center py-10">
          No courses found for this educator.
        </p>
      )}
    </div>
  );
};

export default EducatorCourses;
