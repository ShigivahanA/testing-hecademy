import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import YouTube from "react-youtube";
import { assets } from "../../assets/assets";
import { useParams } from "react-router-dom";
import humanizeDuration from "humanize-duration";
import axios from "axios";
import { toast } from "react-toastify";
import Footer from "../../components/student/Footer";
import Loading from "../../components/student/Loading";
import jsPDF from "jspdf";
import Discussion from "../../components/student/Discussion";
import QuizPanel from "../../components/student/QuizPanel";
import { Menu, X, CheckCircle } from "lucide-react";
import Confetti from "react-confetti";
import Rating from "../../components/student/Rating";

const Player = () => {
  const {
    enrolledCourses,
    backendUrl,
    getToken,
    userData,
    fetchUserEnrolledCourses,
    generateCertificateForCourse,
    certificates,
    navigate,
    loadingUser,
    currency,
    calculateChapterTime,
    calculateCourseDuration,
    calculateRating,
    calculateNoOfLectures,
    isEducator,
  } = useContext(AppContext);

  const { courseId } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const [playerData, setPlayerData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showQuiz, setShowQuiz] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [initialRating, setInitialRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [certificateReady, setCertificateReady] = useState(false);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);

  // ======================================================
  // Fetch and setup
  // ======================================================
  const getCourseData = () => {
    enrolledCourses.forEach((course) => {
      if (course._id === courseId) {
        setCourseData(course);
        const userRating = course.courseRatings.find(
          (item) => item.userId === userData._id
        );
        if (userRating) {
          setInitialRating(userRating.rating);
          setHasRated(true);
        }
      }
    });
  };

  useEffect(() => {
    if (!userData) return;
    if (enrolledCourses.length > 0) getCourseData();
  }, [enrolledCourses, userData]);

  useEffect(() => {
    if (!loadingUser && !userData) navigate("/");
  }, [userData, loadingUser, navigate]);

  // ======================================================
  // Fetch progress data
  // ======================================================
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

  // ======================================================
  // Mark lecture completed
  // ======================================================
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
        setShowConfetti(true);
        await getCourseProgress();

        const totalLectures = courseData.courseContent.reduce(
          (t, ch) => t + ch.chapterContent.length,
          0
        );
        const updatedCompleted =
          data.updatedProgress?.lectureCompleted?.length ||
          progressData?.lectureCompleted?.length + 1;

        if (updatedCompleted >= totalLectures) {
          setPlayerData(null);
          setShowQuiz(null);
          setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 400);
        }

        setTimeout(() => setShowConfetti(false), 4000);
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ======================================================
  // Download Certificate PDF
  // ======================================================
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

  // ======================================================
  // Rating handler
  // ======================================================
  const handleRate = async (rating) => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + "/api/user/add-rating",
        { courseId, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("Thank you for rating!");
        setHasRated(true);
        fetchUserEnrolledCourses();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ======================================================
  // Certificate tracking
  // ======================================================
  useEffect(() => {
    if (userData) getCourseProgress();
  }, [userData]);

  useEffect(() => {
    if (
      progressData &&
      courseData &&
      userData &&
      progressData.lectureCompleted.length ===
        courseData.courseContent.reduce(
          (t, ch) => t + ch.chapterContent.length,
          0
        )
    ) {
      const certExists = certificates.some(
        (c) => c.courseId._id === courseData._id
      );
      if (!certExists) {
        setIsGeneratingCert(true);
        generateCertificateForCourse(courseData, userData);
        setCertificateReady(false);
        setTimeout(() => setIsGeneratingCert(false), 5000);
      } else {
        setCertificateReady(true);
      }
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [progressData, courseData, userData, certificates]);

  // Utility
  const toggleSection = (index) =>
    setOpenSections((prev) => ({ ...prev, [index]: !prev[index] }));

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const isCourseCompleted =
    progressData &&
    progressData.lectureCompleted.length ===
      courseData?.courseContent?.reduce(
        (total, chapter) => total + chapter.chapterContent.length,
        0
      );

  if (!userData || !courseData) return <Loading />;
    return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      {/* 🎉 Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in-out pointer-events-none">
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            numberOfPieces={350}
            gravity={0.25}
            recycle={false}
          />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed z-50 top-0 left-0 h-full w-72 lg:w-80 bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 sticky top-0 z-10">
          <h2
            className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600 transition"
            onClick={() => {
              setPlayerData(null);
              setShowQuiz(null);
              toggleSidebar();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            {courseData.courseTitle}
          </h2>
          <button
            onClick={toggleSidebar}
            className="text-gray-700 hover:text-gray-900 transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* Scrollable Sidebar */}
        <div className="overflow-y-auto h-[calc(100%-64px)] p-4 space-y-4">
          {/* Progress */}
          {progressData && (
            <div className="bg-blue-50 border border-cyan-200 rounded-lg p-3 shadow-sm">
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
            <div
              key={index}
              className="border border-gray-200 rounded-md overflow-hidden shadow-sm"
            >
              <div
                className="flex justify-between items-center px-3 py-2 cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
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

              {/* Lectures */}
              <div
                className={`transition-all overflow-hidden ${
                  openSections[index] ? "max-h-[600px]" : "max-h-0"
                }`}
              >
                <ul className="pl-4 pr-3 py-2 text-sm space-y-1 border-t border-gray-100">
                  {chapter.chapterContent.map((lecture, i) => {
                    const isSelected =
                      playerData?.lectureId === lecture.lectureId;
                    const isCompleted =
                      progressData?.lectureCompleted?.some(
                        (lec) => lec.lectureId === lecture.lectureId
                      );

                    return (
                      <li
                        key={i}
                        onClick={() => {
                          setShowQuiz(null);
                          setPlayerData({
                            ...lecture,
                            chapter: index + 1,
                            lecture: i + 1,
                          });
                          setTimeout(() => {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }, 100);
                          toggleSidebar();
                        }}
                        className={`flex justify-between items-center py-2 px-3 rounded-md cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "bg-blue-50 text-blue-700 font-semibold"
                            : isCompleted
                            ? "bg-green-50 text-green-700 font-medium"
                            : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 w-full truncate">
                          <span className="truncate">
                            {lecture.lectureTitle}
                          </span>
                          <span className="text-xs text-gray-500 sm:ml-auto">
                            {humanizeDuration(
                              lecture.lectureDuration * 60 * 1000,
                              { units: ["m"], round: true }
                            )}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Chapter Quiz */}
                {/* ✅ Chapter Quiz Button with Status */}
{(() => {
  const hasPassedQuiz =
    userData?.activityLog?.some((log) => {
      const logCourseId =
        typeof log.courseId === "object"
          ? log.courseId?._id || log.courseId?.$oid
          : log.courseId;
      return (
        log.action === "completed_quiz" &&
        logCourseId === courseId &&
        log.details?.chapterId === chapter.chapterId &&
        log.details?.passed === true
      );
    }) ?? false;

  const isInProgress = showQuiz === chapter.chapterId;

  return (
    <div className="flex justify-center mb-3">
      <button
        onClick={() => {
          setPlayerData(null);
          setShowQuiz(chapter.chapterId);
          setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
          toggleSidebar();
        }}
        disabled={isInProgress}
        className={`m-2 w-[90%] text-xs px-3 py-2 rounded-md font-medium transition-all duration-200 ${
          hasPassedQuiz
            ? "bg-green-600 text-white hover:bg-green-700"
            : isInProgress
            ? "bg-blue-600 text-white animate-pulse"
            : "bg-yellow-500 hover:bg-yellow-600 text-white"
        }`}
      >
        {isInProgress
          ? "Quiz in Progress"
          : hasPassedQuiz
          ? "Quiz Completed"
          : "Take Chapter Quiz"}
      </button>
    </div>
  );
})()}

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
        ></div>
      )}

      {/* MAIN PLAYER AREA */}
      <div className="flex-1 flex flex-col overflow-y-auto h-full relative">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 bg-white border-b shadow-sm sticky top-0 z-30">
          <button
            onClick={toggleSidebar}
            className="text-gray-700 hover:text-gray-900 transition"
          >
            <Menu size={22} />
          </button>
          <h1 className="font-semibold text-gray-800 text-base truncate max-w-[70%] text-center">
            {courseData.courseTitle}
          </h1>
          <div className="w-6" />
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-10 space-y-10 overflow-y-auto">
          {/* 🎯 QUIZ / VIDEO */}
          {showQuiz ? (
            <QuizPanel
              courseId={courseId}
              chapterId={showQuiz}
              onClose={() => setShowQuiz(null)}
              onPass={async () => {
                toast.success("Quiz Passed!");
                await fetchUserEnrolledCourses();
                await getCourseProgress();
              }}
            />
          ) : playerData ? (
            <>
              <YouTube
                className="w-full"
                iframeClassName="w-full aspect-video max-w-6xl mx-auto rounded-xl shadow-lg"
                videoId={playerData.lectureUrl.split("/").pop()}
              />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 gap-3">
                <p className="text-sm sm:text-base md:text-lg font-medium">
                  {playerData.chapter}.{playerData.lecture}{" "}
                  {playerData.lectureTitle}
                </p>
                <button
                  onClick={() => markLectureAsCompleted(playerData.lectureId)}
                  className="text-blue-600 text-sm sm:text-base hover:underline"
                >
                  {progressData?.lectureCompleted?.some(
                    (lec) => lec.lectureId === playerData.lectureId
                  )
                    ? "Completed"
                    : "Mark Complete"}
                </button>
              </div>

              <div className="mt-8">
                <Discussion
                  courseId={courseId}
                  lectureId={playerData.lectureId}
                />
              </div>
            </>
          ) : (
            // 🏠 HOME VIEW (CourseDetails Layout Embedded)
            <div className="w-full flex flex-col lg:flex-row items-start justify-between gap-10 mt-8">
              {/* Left: Thumbnail */}
              <div className="w-full lg:w-1/2 bg-white shadow-md rounded-lg overflow-hidden">
                <img
                  src={courseData.courseThumbnail}
                  alt={courseData.courseTitle}
                  className="w-full object-cover max-h-[420px]"
                />
              </div>

              {/* Right: Course Navigation */}
              <div className="flex-1 w-full">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Course Content
                </h2>
                {courseData.courseContent.map((chapter, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 bg-white mb-3 rounded-lg shadow-sm"
                  >
                    <div
                      className="flex justify-between items-center px-4 py-3 cursor-pointer"
                      onClick={() => toggleSection(index)}
                    >
                      <p className="font-medium text-gray-700">
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
                      className={`overflow-hidden transition-all duration-300 ${
                        openSections[index] ? "max-h-96" : "max-h-0"
                      }`}
                    >
                      <ul className="list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-200">
                        {chapter.chapterContent.map((lecture, i) => (
                          <li
                            key={i}
                            onClick={() => {
                              setPlayerData({
                                ...lecture,
                                chapter: index + 1,
                                lecture: i + 1,
                              });
                              setShowQuiz(null);
                              setTimeout(
                                () =>
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  }),
                                100
                              );
                            }}
                            className="flex justify-between items-center cursor-pointer py-2 hover:text-blue-600"
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

                      {/* ✅ CourseDetails Quiz Button with Status */}
{(() => {
  const hasPassedQuiz =
    userData?.activityLog?.some((log) => {
      const logCourseId =
        typeof log.courseId === "object"
          ? log.courseId?._id || log.courseId?.$oid
          : log.courseId;
      return (
        log.action === "completed_quiz" &&
        logCourseId === courseId &&
        log.details?.chapterId === chapter.chapterId &&
        log.details?.passed === true
      );
    }) ?? false;

  const isInProgress = showQuiz === chapter.chapterId;

  return (
    <div className="flex justify-center pb-3">
      <button
        onClick={() => {
          setPlayerData(null);
          setShowQuiz(chapter.chapterId);
          setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
        }}
        disabled={isInProgress}
        className={`text-sm px-4 py-2 rounded-md font-medium transition-all duration-200 ${
          hasPassedQuiz
            ? "bg-green-600 text-white hover:bg-green-700"
            : isInProgress
            ? "bg-blue-600 text-white animate-pulse"
            : "bg-yellow-500 hover:bg-yellow-600 text-white"
        }`}
      >
        {isInProgress
          ? "Quiz in Progress"
          : hasPassedQuiz
          ? "Quiz Completed"
          : "Take Chapter Quiz"}
      </button>
    </div>
  );
})()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* ⭐ RATING & CERTIFICATE (below CourseDetails) */}
          {!playerData && !showQuiz && isCourseCompleted && (
            <div className="flex flex-col items-center w-full mt-10 space-y-8">
              {/* Rating Section */}
              <div className="p-6 text-center w-full max-w-2xl bg-white rounded-xl shadow-sm">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-5">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Rate this Course
                  </h2>
                  <Rating initialRating={initialRating} onRate={handleRate} />
                </div>

                {!hasRated && (
                  <p className="text-xs text-gray-500 mt-2">
                    Please submit your rating to unlock your certificate.
                  </p>
                )}
              </div>

              {/* Certificate Section */}
              <div className="text-center bg-gradient-to-br from-green-50 via-white to-green-100 border border-green-200 rounded-2xl p-8 shadow-md w-full max-w-2xl transition-all">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-3">
                  🎓 Course Completed!
                </h1>

                {hasRated ? (
                  certificateReady ? (
                    <button
                      onClick={() => {
                        const cert = certificates.find(
                          (c) => c.courseId._id === courseData._id
                        );
                        if (cert)
                          downloadCertificatePDF(courseData, userData, cert);
                      }}
                      className="mt-3 px-8 py-3 bg-green-600 text-white font-medium text-lg rounded-lg hover:bg-green-700 transition-transform duration-300 hover:scale-105"
                    >
                      Download Certificate
                    </button>
                  ) : isGeneratingCert ? (
                    <p className="text-green-700 font-medium animate-pulse">
                      Generating your certificate... ⏳
                    </p>
                  ) : (
                    <p className="text-gray-600 font-medium">
                      Please rate the course to generate your certificate.
                    </p>
                  )
                ) : (
                  <p className="text-gray-600 font-medium">
                    Please rate the course to generate your certificate.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

// ✨ Fade Animation Style for Confetti
<style>
{`
@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; }
}
.animate-fade-in-out {
  animation: fadeInOut 4s ease-in-out forwards;
}
`}
</style>

export default Player;
