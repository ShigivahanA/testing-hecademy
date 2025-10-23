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
import { Menu, X, CheckCircle } from "lucide-react";

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
  const params = new URLSearchParams(location.search);
  const initialLecture = params.get("lecture");


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

  // ✅ Toggle chapter accordion
  const toggleSection = (index) => {
    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  useEffect(() => {
    if (!userData) return;
    if (enrolledCourses.length > 0) getCourseData();
  }, [enrolledCourses, userData]);

  useEffect(() => {
    if (!loadingUser && !userData) navigate("/");
  }, [userData, loadingUser, navigate]);

  // ✅ Mark lecture as completed
  const markLectureAsCompleted = async (lectureId) => {
    if (!userData || !courseData) return;
    try {
      const token = await getToken();
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

  // ✅ Fetch progress
  const getCourseProgress = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + "/api/user/get-course-progress",
        { courseId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) setProgressData(data.progressData);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Certificate PDF
  const downloadCertificatePDF = (course, user, certificate) => {
    const userName = user?.name || "Student";
    const courseName = course?.courseTitle || "Unnamed Course";
    const rawDate = new Date(certificate?.issueDate || Date.now());
    const issueDate = `${rawDate.getDate()}-${
      rawDate.getMonth() + 1
    }-${rawDate.getFullYear()}`;
    const verifyLink = `${window.location.origin}/verify/${certificate?.certificateId}`;

    const doc = new jsPDF("landscape", "pt", "a4");
    doc.addImage(assets.certificateTemplate, "PNG", 0, 0, 842, 595);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text(userName, 478, 265, { align: "center" });
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

  const isCourseCompleted =
    progressData &&
    progressData.lectureCompleted.length ===
      courseData?.courseContent?.reduce(
        (total, chapter) => total + chapter.chapterContent.length,
        0
      );

  const handleRate = async (rating) => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + "/api/user/add-rating",
        { courseId, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message);
        fetchUserEnrolledCourses();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (userData) getCourseProgress();
  }, [userData]);

  useEffect(() => {
    if (isCourseCompleted && courseData && userData) {
      const alreadyHasCert = certificates.some(
        (c) => c.courseId._id === courseData._id
      );
      if (!alreadyHasCert)
        generateCertificateForCourse(courseData, userData);
    }
  }, [isCourseCompleted, courseData, userData, certificates]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (!userData) return <Loading />;
  if (!courseData) return <Loading />;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`fixed lg:relative top-0 left-0 z-40 h-full lg:h-auto bg-white border-r border-gray-200 shadow-md transition-transform duration-300 w-72 lg:w-80 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-tr-lg">
          <h2 className="text-lg font-semibold text-gray-800">
            {courseData.courseTitle}
          </h2>
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-gray-700 hover:text-gray-900"
          >
            <X size={22} />
          </button>
        </div>

        {/* Sidebar Scroll */}
        <div className="overflow-y-auto h-[calc(100vh-60px)] p-4 space-y-4">
          {/* Course Progress */}
          {progressData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex justify-between text-sm text-gray-700 mb-2">
                <span>Progress</span>
                <span>
                  {progressData.lectureCompleted.length}/
                  {courseData.courseContent.reduce(
                    (t, ch) => t + ch.chapterContent.length,
                    0
                  )}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all"
                  style={{
                    width: `${
                      (progressData.lectureCompleted.length /
                        courseData.courseContent.reduce(
                          (t, ch) => t + ch.chapterContent.length,
                          0
                        )) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
              {isCourseCompleted && (
                <p className="mt-2 text-green-600 text-sm flex items-center gap-1 font-medium">
                  <CheckCircle size={16} /> Course Completed
                </p>
              )}
            </div>
          )}

          {/* Chapters */}
          {courseData.courseContent.map((chapter, index) => (
            <div key={index} className="border border-gray-200 rounded-md">
              <div
                className="flex justify-between items-center px-3 py-2 cursor-pointer select-none bg-gray-50 hover:bg-gray-100"
                onClick={() => toggleSection(index)}
              >
                <p className="font-medium text-sm text-gray-800">
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
                  openSections[index] ? "max-h-[500px]" : "max-h-0"
                }`}
              >
                <ul className="pl-4 pr-3 py-2 text-sm space-y-1 border-t border-gray-100">
                  {chapter.chapterContent.map((lecture, i) => (
                    <li
                      key={i}
                      onClick={() => {
                        setPlayerData({
                          ...lecture,
                          chapter: index + 1,
                          lecture: i + 1,
                        });
                        if (window.innerWidth < 1024) toggleSidebar();
                      }}
                      className={`flex justify-between items-center py-1 px-2 rounded-md cursor-pointer ${
                        playerData?.lectureId === lecture.lectureId
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "hover:bg-gray-100"
                      }`}
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

      {/* Main Player Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex justify-between items-center px-4 py-3 bg-white border-b shadow-sm">
          <button onClick={toggleSidebar}>
            <Menu size={22} className="text-gray-700" />
          </button>
          <h1 className="font-semibold text-gray-800 text-base truncate">
            {courseData.courseTitle}
          </h1>
          <div className="w-6" />
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-10 space-y-8">
          {/* Video */}
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
                  onClick={() =>
                    markLectureAsCompleted(playerData.lectureId)
                  }
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

          {/* Discussion */}
          {playerData && (
            <Discussion
              courseId={courseId}
              lectureId={playerData.lectureId}
            />
          )}

          {/* Rating & Certificate */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <h1 className="text-xl font-bold">Rate this Course:</h1>
              <Rating initialRating={initialRating} onRate={handleRate} />
            </div>

            {isCourseCompleted && (
              <div className="text-center bg-green-50 border border-green-200 rounded-lg p-6 shadow-sm">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">
                  You have successfully completed the course
                </h1>
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
                  className={`mt-3 w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-medium text-lg rounded-lg hover:bg-green-700 transition-all duration-500 transform hover:scale-105 ${
                    certificates.find(
                      (c) => c.courseId._id === courseData._id
                    )
                      ? "opacity-100"
                      : "opacity-60 cursor-not-allowed"
                  }`}
                >
                  Download Certificate
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
