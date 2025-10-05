import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { Line } from "rc-progress";
import Footer from "../../components/student/Footer";
import PreferenceModal from "../../components/student/PreferenceModal";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";
import jsPDF from "jspdf";
import { assets } from "../../assets/assets";

const MyEnrollments = () => {
  const {
    userData,
    enrolledCourses,
    fetchUserEnrolledCourses,
    navigate,
    backendUrl,
    getToken,
    calculateCourseDuration,
    calculateNoOfLectures,
    isEducator,
    certificates,
  } = useContext(AppContext);

  const [progressArray, setProgressData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ongoing"); // 👈 new state

  const getCourseProgress = async () => {
    if (!userData) return;
    try {
      const token = await getToken();
      if (!token) return;

      const tempProgressArray = await Promise.all(
        enrolledCourses.map(async (course) => {
          const { data } = await axios.post(
            `${backendUrl}/api/user/get-course-progress`,
            { courseId: course._id },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          let totalLectures = calculateNoOfLectures(course);
          const lectureCompleted = data.progressData
            ? data.progressData.lectureCompleted.length
            : 0;
          return { totalLectures, lectureCompleted };
        })
      );

      setProgressData(tempProgressArray);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData) {
      fetchUserEnrolledCourses();
    }
  }, [userData]);

  useEffect(() => {
    if (userData && enrolledCourses.length > 0) {
      getCourseProgress();
    } else if (userData) {
      setLoading(false);
    }
  }, [enrolledCourses, userData]);

  // PDF certificate download
  const downloadCertificatePDF = (course, user, certificate) => {
    const userName = user?.name || "Student";
    const courseName = course?.courseTitle || "Unnamed Course";
    const rawDate = new Date(certificate?.issueDate || Date.now());
    const issueDate = `${rawDate.getDate()}-${rawDate.getMonth() + 1}-${rawDate.getFullYear()}`;
    const verifyLink = `${window.location.origin}/verify/${certificate?.certificateId}`;

    const doc = new jsPDF("landscape", "pt", "a4");
    doc.addImage(assets.certificateTemplate, "PNG", 0, 0, 842, 595);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text(userName, 478, 265, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(courseName, 475, 355, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(14);
    doc.text(issueDate, 270, 47, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Verify: ${verifyLink}`, 475, 425, { align: "center" });

    doc.save(`${userName}_${courseName}_certificate.pdf`);
  };

  if (!userData) {
    return (
      <>
        <div className="md:px-36 px-8 pt-10">
          <h1 className="text-2xl font-semibold">My Enrollments</h1>
          <p className="text-center mt-10 text-gray-500">
            Please log in to view your enrollments.
          </p>
        </div>
        <Footer />
      </>
    );
  }

  if (loading) {
    return <Loading />;
  }

  // Separate courses
  const completedCourses = enrolledCourses.filter((course, i) => {
    return (
      progressArray[i] &&
      progressArray[i].lectureCompleted === progressArray[i].totalLectures
    );
  });

  const ongoingCourses = enrolledCourses.filter((course, i) => {
    return (
      progressArray[i] &&
      progressArray[i].lectureCompleted < progressArray[i].totalLectures
    );
  });

  return (
    <>
      <div className="md:px-36 px-8 pt-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">My Enrollments</h1>
          {!isEducator && (
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Change Preferences
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab("ongoing")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === "ongoing"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Ongoing
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === "completed"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Completed
          </button>
        </div>

        {/* Ongoing Courses */}
{/* Ongoing Courses */}
{activeTab === "ongoing" && (
  <div className="space-y-4">
    {/* Desktop Table */}
    <div className="hidden md:block">
      <table className="w-full border-[0.5px] rounded-lg border-gray-500/20 shadow-md">
        <thead className="text-gray-900 border-b border-gray-500/20 text-sm">
          <tr>
            <th className="px-4 py-3 text-left">Course</th>
            <th className="px-4 py-3 text-left">Duration</th>
            <th className="px-4 py-3 text-left">Completed</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody className="text-gray-700">
          {ongoingCourses.map((course, index) => {
            const i = enrolledCourses.indexOf(course);
            return (
              <tr key={course._id} className="border-b border-gray-500/20">
              <td className="px-4 py-3">
  <div className="flex items-center gap-3 min-w-[150px]">
    <img
      src={course.courseThumbnail}
      alt=""
      onClick={() => navigate("/player/" + course._id)}
      className="w-14 sm:w-20 md:w-24 rounded object-cover flex-shrink-0 cursor-pointer"
    />
    <p className="font-medium text-sm sm:text-base truncate max-w-[120px] hover:underline cursor-pointer" onClick={() => navigate("/player/" + course._id)}>
      {course.courseTitle}
    </p>
  </div>
</td>

<td className="px-4 py-3 text-xs sm:text-sm md:text-base whitespace-nowrap">
  {calculateCourseDuration(course)}
</td>

<td className="px-4 py-3 text-xs sm:text-sm md:text-base whitespace-nowrap">
  {progressArray[i] &&
    `${progressArray[i].lectureCompleted} / ${progressArray[i].totalLectures}`}{" "}
  <span className="ml-1 text-[10px] sm:text-xs text-gray-500">Lectures</span>
</td>

                <td className="px-4 py-3">
                  <button
                    onClick={() => navigate("/player/" + course._id)}
                    className="px-3 sm:px-5 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    Continue
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Mobile Cards */}
    <div className="md:hidden space-y-4">
      {ongoingCourses.map((course, index) => {
        const i = enrolledCourses.indexOf(course);
        return (
          <div
            key={course._id}
            className="border border-gray-200 rounded-lg shadow-sm p-4 bg-white"
          >
            <div className="flex gap-3 items-center">
              <img
                src={course.courseThumbnail}
                alt=""
                className="w-20 h-14 rounded object-cover"
              />
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {course.courseTitle}
                </h3>
                <p className="text-xs text-gray-500">
                  {calculateCourseDuration(course)}
                </p>
                <p className="text-xs text-gray-500">
                  {progressArray[i] &&
                    `${progressArray[i].lectureCompleted} / ${progressArray[i].totalLectures}`}{" "}
                  Lectures
                </p>
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={() => navigate("/player/" + course._id)}
                className="w-full px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
              >
                Continue
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}


        {/* Completed Courses */}
{activeTab === "completed" && (
  <div className="space-y-4">
    {/* Desktop Table */}
    <div className="hidden md:block">
      <table className="w-full border border-gray-200 rounded-lg shadow-md overflow-hidden">
        <thead className="bg-gray-100 text-gray-900 text-sm">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Course</th>
            <th className="px-4 py-3 text-left font-semibold">Completed on</th>
            <th className="px-4 py-3 text-left font-semibold">Certificate</th>
          </tr>
        </thead>
        <tbody className="text-gray-700 divide-y divide-gray-200">
          {completedCourses.map((course) => {
            const cert = certificates.find(
              (c) => c.courseId._id === course._id
            );
            return (
              <tr key={course._id} className="hover:bg-gray-50 transition-colors">
                <td
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:underline"
                  onClick={() => navigate("/player/" + course._id)}
                >
                  <img
                    src={course.courseThumbnail}
                    alt=""
                    className="w-16 h-12 rounded object-cover"
                  />
                  <span className="font-medium">{course.courseTitle}</span>
                </td>
                <td className="px-4 py-3">
                  {cert ? new Date(cert.issueDate).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  {cert ? (
                    <button
                      onClick={() =>
                        downloadCertificatePDF(course, userData, cert)
                      }
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition w-full"
                    >
                      Download
                    </button>
                  ) : (
                    <span className="text-gray-500 text-sm">Generating...</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Mobile Cards */}
    <div className="md:hidden space-y-4">
      {completedCourses.map((course) => {
        const cert = certificates.find((c) => c.courseId._id === course._id);

        return (
          <div
            key={course._id}
            onClick={() => navigate("/player/" + course._id)}
            className="border border-gray-200 rounded-lg shadow-sm p-4 bg-white cursor-pointer"
          >
            <div className="flex gap-3 items-center">
              <img
                src={course.courseThumbnail}
                alt=""
                className="w-20 h-14 rounded object-cover"
              />
              <div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                  {course.courseTitle}
                </h3>
                <p className="text-xs text-gray-500">
                  Completed:{" "}
                  {cert
                    ? new Date(cert.issueDate).toLocaleDateString()
                    : "Generating..."}
                </p>
              </div>
            </div>
            {cert ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadCertificatePDF(course, userData, cert);
                }}
                className="mt-3 w-full px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
              >
                Download Certificate
              </button>
            ) : (
              <span className="block mt-3 text-gray-500 text-xs">
                Generating...
              </span>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}
      </div>

      <Footer />
      {showModal && <PreferenceModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default MyEnrollments;
