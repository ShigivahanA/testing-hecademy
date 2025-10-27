import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { Edit3, Eye, EyeOff, Save, Loader2 } from "lucide-react";

const ManageCourse = () => {
  const { backendUrl, getToken } = useContext(AppContext);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Fetch all educator courses
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/educator/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) setCourses(data.courses || []);
      else toast.error(data.message);
    } catch (err) {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Toggle publish/unpublish
  const toggleVisibility = async (id) => {
    try {
      const token = await getToken();
      const { data } = await axios.patch(
        `${backendUrl}/api/educator/toggle-visibility/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        setCourses((prev) =>
          prev.map((c) =>
            c._id === id ? { ...c, isPublished: data.isPublished } : c
          )
        );
      } else toast.error(data.message);
    } catch (error) {
      toast.error("Action failed");
    }
  };

  // Save course edits
  const handleSave = async () => {
    try {
      setUpdating(true);
      const token = await getToken();

      const formData = new FormData();
      formData.append("courseData", JSON.stringify(selectedCourse));

      const { data } = await axios.put(
        `${backendUrl}/api/educator/update-course/${selectedCourse._id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success("Course updated!");
        setSelectedCourse(null);
        fetchCourses();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-[60vh] text-gray-600">
        <Loader2 className="animate-spin mr-2" /> Loading courses...
      </div>
    );

  return (
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        Manage Your Courses
      </h1>

      {courses.length === 0 ? (
        <p className="text-gray-600">No courses added yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course._id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <img
                  src={course.courseThumbnail}
                  alt={course.courseTitle}
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />
                <h2 className="font-semibold text-gray-800 truncate">
                  {course.courseTitle}
                </h2>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                  {course.courseDescription.replace(/<[^>]+>/g, "")}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  <b>Price:</b> ₹{course.coursePrice} |{" "}
                  <b>Discount:</b> {course.discount}%
                </p>
                <p className="text-sm mt-1">
                  <b>Visibility:</b>{" "}
                  <span
                    className={`${
                      course.isPublished ? "text-green-600" : "text-red-500"
                    } font-medium`}
                  >
                    {course.isPublished ? "Published" : "Hidden"}
                  </span>
                </p>
              </div>

              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => setSelectedCourse(course)}
                  className="flex items-center gap-1 text-sm bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition"
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  onClick={() => toggleVisibility(course._id)}
                  className="flex items-center gap-1 text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 transition"
                >
                  {course.isPublished ? (
                    <>
                      <EyeOff size={14} /> Hide
                    </>
                  ) : (
                    <>
                      <Eye size={14} /> Publish
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Popup */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white w-full max-w-lg rounded-lg p-6 relative shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Edit Course – {selectedCourse.courseTitle}
            </h2>

            <label className="text-sm text-gray-700">Title</label>
            <input
              type="text"
              value={selectedCourse.courseTitle}
              onChange={(e) =>
                setSelectedCourse({
                  ...selectedCourse,
                  courseTitle: e.target.value,
                })
              }
              className="w-full border rounded px-3 py-2 mb-3"
            />

            <label className="text-sm text-gray-700">Price</label>
            <input
              type="number"
              value={selectedCourse.coursePrice}
              onChange={(e) =>
                setSelectedCourse({
                  ...selectedCourse,
                  coursePrice: e.target.value,
                })
              }
              className="w-full border rounded px-3 py-2 mb-3"
            />

            <label className="text-sm text-gray-700">Discount (%)</label>
            <input
              type="number"
              value={selectedCourse.discount}
              onChange={(e) =>
                setSelectedCourse({
                  ...selectedCourse,
                  discount: e.target.value,
                })
              }
              className="w-full border rounded px-3 py-2 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedCourse(null)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updating}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {updating ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCourse;
