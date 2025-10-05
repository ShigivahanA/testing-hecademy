import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loading from '../../components/student/Loading';

const MyCourses = () => {
  const { backendUrl, isEducator, currency, getToken } = useContext(AppContext);
  const [courses, setCourses] = useState(null);

  const fetchEducatorCourses = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(
        backendUrl + '/api/educator/courses',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      data.success && setCourses(data.courses);
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (isEducator) {
      fetchEducatorCourses();
    }
  }, [isEducator]);

  return courses ? (
    <div className="min-h-screen flex flex-col items-start justify-between md:p-8 md:pb-0 p-4 pt-8 pb-0">
      <div className="w-full">
        <h2 className="pb-4 text-base md:text-lg font-medium">My Courses</h2>

        <div className="flex flex-col items-center max-w-4xl w-full overflow-hidden rounded-xl bg-white border border-gray-500/20 mb-5">
          <table className="table-fixed w-full overflow-hidden">
            <thead className="text-gray-900 border-b border-gray-500/20 text-xs md:text-sm text-left">
              <tr>
                <th className="px-3 md:px-4 py-2 md:py-3 font-semibold truncate">All Courses</th>
                <th className="px-3 md:px-4 py-2 md:py-3 font-semibold truncate">Earnings</th>
                <th className="px-3 md:px-4 py-2 md:py-3 font-semibold truncate">Students</th>
                <th className="px-3 md:px-4 py-2 md:py-3 font-semibold truncate">Published On</th>
              </tr>
            </thead>

            <tbody className="text-xs md:text-sm text-gray-500">
              {courses.map((course) => (
                <tr key={course._id} className="border-b border-gray-500/20">
                  <td className="px-2 md:px-4 py-2 md:py-3 flex items-center space-x-2 md:space-x-3 truncate">
                    <img src={course.courseThumbnail} alt="Course Image" className="w-10 md:w-16" />
                    <span className="truncate hidden md:block">{course.courseTitle}</span>
                  </td>
                  <td className="px-3 md:px-4 py-2 md:py-3">
                    {currency}{" "}
                    {Math.floor(
                      course.enrolledStudents.length *
                        (course.coursePrice -
                          (course.discount * course.coursePrice) / 100)
                    )}
                  </td>
                  <td className="px-3 md:px-4 py-2 md:py-3">
                    {course.enrolledStudents.length}
                  </td>
                  <td className="px-3 md:px-4 py-2 md:py-3">
                    {new Date(course.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default MyCourses;
