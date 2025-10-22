import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import YouTube from "react-youtube";
import { assets } from "../../assets/assets";
import { useParams } from "react-router-dom";
import humanizeDuration from "humanize-duration";
import axios from "axios";
import { toast } from "react-toastify";
import Rating from "../../components/student/Rating";
import Footer from "../../components/student/Footer";
import Loading from "../../components/student/Loading";
import jsPDF from "jspdf";
import Discussion from "../../components/student/Discussion";
import { Menu, X } from "lucide-react";

const Player = () => {
  const {
    enrolledCourses,
    backendUrl,
    getToken,
    calculateChapterTime,
    userData,
    fetchUserEnrolledCourses,
    generateCertificateForCourse,
    certificates,
    navigate,
    loadingUser,
  } = useContext(AppContext);

  const { courseId } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const [playerData, setPlayerData] = useState(null);
  const [initialRating, setInitialRating] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ✅ Get course data
  const getCourseData = () => {
    enrolledCourses.forEach((course) => {
      if (course._id === courseId) {
        setCourseData(course);
        course.courseRatings.forEach((item) => {
          if (item.userId === userData._id) {
            setInitialRating(item.rating);
          }
        });
      }
    });
  };

  // ✅ Toggle sections
  const toggleSection = (index) => {
    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // ✅ Initial data load
  useEffect(() => {
    if (!userData) return;
    if (enrolledCourses.length > 0) getCourseData();
  }, [enrolledCourses, userData]);

  // ✅ Redirect if not logged in
  useEffect(() => {
    if (!loadingUser && !userData) navigate("/");
  }, [userData, loadingUser, navigate]);

  // ✅ Mark lecture as completed
  const markLectureAsCompleted = async (lectureId) => {
    if (!userData || !courseData) return;

    try {
      const token = await getToken();
      if (!token) return;

      const lecture = courseData.courseContent
        .flatMap((ch) => ch.chapterContent)
        .find((lec) => lec.lectureId === lectureId);

      const lectureDuration = lecture?.lectureDuration || 0;

      const { data } = await axios.post(
        backendUrl + "/api/user/update-course-progress",
        { courseId, lectureId, duration: lectureDuration },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        getCourseProgress();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Fetch course progress
  const getCourseProgress = async () => {
    if (!userData) return;
    try {
      const token = await getToken();
      if (!token) return;

      const { data } = await axios.post(
        backendUrl + "/api/user/get-course-progress",
        { courseId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) setProgressData(data.progressData);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Certificate download
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
    doc.text(`Verify here: ${verifyLink}`, 475, 425, { align: "center" });
    doc.save(`${userName}_${courseName}_certificate.pdf`);
  };

  // ✅ Course completion check
  const isCourseCompleted =
    progressData &&
    progressData.lectureCompleted.length ===
      courseData?.courseContent?.reduce(
        (total, chapter) => total + chapter.chapterContent.length,
        0
      );

  // ✅ Handle rating
  const handleRate = async (rating) => {
    if (!userData) return;
    try {
      const token = await getToken();
      if (!token) return;

      const { data } = await axios.post(
        backendUrl + "/api/user/add-rating",
        { courseId, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        fetchUserEnrolledCourses();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Data setup
  useEffect(() => {
    if (userData) getCourseProgress();
  }, [userData]);

  // ✅ Certificate generator
  useEffect(() => {
    if (isCourseCompleted && courseData && userData) {
      const alreadyHasCert = certificates.some(
        (c) => c.courseId._id === courseData._id
      );
      if (!alreadyHasCert)
        generateCertificateForCourse(courseData, userData);
    }
  }, [isCourseCompleted, courseData, userData, certificates]);

  // ✅ Reset state on logout
  useEffect(() => {
    if (!userData) {
      setCourseData(null);
      setProgressData(null);
      setPlayerData(null);
    } else {
      getCourseProgress();
      getCourseData();
    }
  }, [userData]);

  // ✅ Handle sidebar toggle
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (!userData) {
    return (
      <>
        <div className="md:px-36 px-8 pt-10">
          <h1 className="text-2xl font-semibold">Course Player</h1>
          <p className="text-center mt-20 text-gray-500">
            Please log in to watch your courses.
          </p>
        </div>
        <Footer />
      </>
    );
  }

  if (!courseData)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">Course not found or not enrolled.</p>
      </div>
    );

  return courseData ? (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`fixed lg:static top-0 left-0 h-full z-40 transition-transform duration-300 bg-white border-r border-gray-200 shadow-lg ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } w-72`}
      >
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Course Structure</h2>
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-gray-700 hover:text-gray-900"
          >
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-60px)] p-4 space-y-3">
          {courseData?.courseContent.map((chapter, index) => (
            <div
              key={index}
              className="border border-gray-200 bg-white rounded-md overflow-hidden"
            >
              <div
                className="flex justify-between items-center px-4 py-3 cursor-pointer select-none hover:bg-gray-50"
                onClick={() => toggleSection(index)}
              >
                <p className="font-medium text-gray-800 text-sm">
                  {chapter.chapterTitle}
                </p>
                <img
                  src={assets.down_arrow_icon}
                  alt="arrow"
                  className={`w-4 h-4 transition-transform ${
                    openSections[index] ? "rotate-180" : ""
                  }`}
                />
              </div>
              <div
                className={`transition-all overflow-hidden ${
                  openSections[index] ? "max-h-[400px]" : "max-h-0"
                }`}
              >
                <ul className="pl-4 pr-3 py-2 text-sm text-gray-700 space-y-1 border-t border-gray-100">
                  {chapter.chapterContent.map((lecture, i) => (
                    <li
                      key={i}
                      className={`flex justify-between items-center py-1 cursor-pointer hover:text-blue-600 ${
                        playerData?.lectureId === lecture.lectureId
                          ? "text-blue-700 font-semibold"
                          : ""
                      }`}
                      onClick={() => {
                        setPlayerData({
                          ...lecture,
                          chapter: index + 1,
                          lecture: i + 1,
                        });
                        if (window.innerWidth < 1024) toggleSidebar();
                      }}
                    >
                      <span>{lecture.lectureTitle}</span>
                      <span className="text-xs text-gray-500">
                        {humanizeDuration(
                          lecture.lectureDuration * 60 * 1000,
                          { units: ["m"], round: true }
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Player */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden flex justify-between items-center px-4 py-3 bg-white border-b shadow-sm">
          <button onClick={toggleSidebar}>
            <Menu size={22} className="text-gray-700" />
          </button>
          <h1 className="font-semibold text-gray-800 text-base">
            {courseData?.courseTitle}
          </h1>
          <div className="w-6" />
        </div>

        <div className="p-4 sm:p-6 lg:p-10 flex flex-col gap-6">
          {/* Video Section */}
          <div className="w-full">
            {playerData ? (
              <div>
                <YouTube
                  iframeClassName="w-full aspect-video rounded-lg shadow"
                  videoId={playerData.lectureUrl.split("/").pop()}
                />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 gap-2">
                  <p className="text-sm sm:text-base md:text-lg font-medium">
                    {playerData.chapter}.{playerData.lecture}{" "}
                    {playerData.lectureTitle}
                  </p>
                  <button
                    onClick={() => markLectureAsCompleted(playerData.lectureId)}
                    className="text-blue-600 text-sm sm:text-base"
                  >
                    {progressData?.lectureCompleted?.some(
                      (lec) => lec.lectureId === playerData.lectureId
                    )
                      ? "Completed"
                      : "Mark Complete"}
                  </button>
                </div>
              </div>
            ) : (
              <img
                src={courseData.courseThumbnail}
                alt="Course Thumbnail"
                className="rounded-lg shadow"
              />
            )}
          </div>

          {/* Lecture Discussion */}
          {playerData && (
            <Discussion courseId={courseId} lectureId={playerData?.lectureId} />
          )}

          {/* Rating + Certificate */}
          <div className="border-t pt-6 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <h1 className="text-xl font-bold">Rate this Course:</h1>
              <Rating initialRating={initialRating} onRate={handleRate} />
            </div>

            {isCourseCompleted && (
              <div className="mt-6 text-center bg-green-50 border border-green-200 rounded-lg p-6 shadow-sm">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">
                  You have successfully completed the course
                </h1>
                <div className="relative min-h-[50px] flex justify-center items-center">
                  <p
                    className={`absolute transition-opacity duration-500 ${
                      certificates.find(
                        (c) => c.courseId._id === courseData._id
                      )
                        ? "opacity-0"
                        : "opacity-100"
                    }`}
                  >
                    Generating your certificate... please wait
                  </p>
                  <button
                    onClick={() => {
                      const cert = certificates.find(
                        (c) => c.courseId._id === courseData._id
                      );
                      if (cert)
                        downloadCertificatePDF(courseData, userData, cert);
                    }}
                    disabled={
                      !certificates.find(
                        (c) => c.courseId._id === courseData._id
                      )
                    }
                    className={`w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-medium text-lg rounded-lg hover:bg-green-700 transition-all duration-500 transform hover:scale-105 ${
                      certificates.find(
                        (c) => c.courseId._id === courseData._id
                      )
                        ? "opacity-100"
                        : "opacity-0 pointer-events-none"
                    }`}
                  >
                    Download Certificate
                  </button>
                </div>
              </div>
            )}
          </div>

          <Footer />
        </div>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default Player;
