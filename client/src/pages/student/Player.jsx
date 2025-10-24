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
import QuizPanel from "../../components/student/QuizPanel";
import { Menu, X, CheckCircle } from "lucide-react";
import Confetti from "react-confetti";


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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showQuiz, setShowQuiz] = useState(null);
  const params = new URLSearchParams(location.search);
  const initialLecture = params.get("lecture");
  const [showConfetti, setShowConfetti] = useState(false);


  // ✅ Get course data
  const getCourseData = () => {
    enrolledCourses.forEach((course) => {
      if (course._id === courseId) {
        setCourseData(course);
        course.courseRatings.forEach((item) => {
          if (item.userId === userData._id) setInitialRating(item.rating);
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
        setShowConfetti(true);
        await getCourseProgress();

      // 🎯 Check if all lectures are now completed
      const totalLectures = courseData.courseContent.reduce(
        (t, ch) => t + ch.chapterContent.length,
        0
      );

      const updatedCompleted = data.updatedProgress?.lectureCompleted?.length ||
        progressData?.lectureCompleted?.length + 1;

      if (updatedCompleted >= totalLectures) {
        // ✅ Course fully completed — reset player
        setPlayerData(null);
        setShowQuiz(null);

        // Smoothly scroll to the top (home thumbnail view)
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 500);
      }
        setTimeout(() => setShowConfetti(false), 4000); 
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
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [isCourseCompleted, courseData, userData, certificates]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (!userData || !courseData) return <Loading />;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      {showConfetti && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in-out pointer-events-none"
          >
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

        {/* Scrollable Sidebar Content */}
        <div className="overflow-y-auto h-[calc(100%-64px)] p-4 space-y-4">
          {/* Progress Bar */}
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
                          <span
                            className={`truncate ${
                              isCompleted
                                ? "text-green-700"
                                : isSelected
                                ? "text-blue-700"
                                : ""
                            }`}
                          >
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
                    <button
                      onClick={() => {
                        setPlayerData(null);
                        setShowQuiz(chapter.chapterId);
                        setTimeout(() => {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }, 100);
                        toggleSidebar();
                      }}
                      className={`m-3 w-[90%] text-xs px-3 py-2 rounded-md transition font-medium ${
                        isInProgress
                          ? "bg-green-600 text-white"
                          : hasPassedQuiz
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "bg-yellow-500 hover:bg-yellow-600 text-white"
                      }`}
                    >
                      {isInProgress
                        ? "Quiz in Progress"
                        : hasPassedQuiz
                        ? "Quiz Completed"
                        : "Take Chapter Quiz"}
                    </button>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overlay when sidebar open */}
      {isSidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
        ></div>
      )}

      {/* Main Player Area */}
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
          {/* Video / Quiz */}
          {showQuiz ? (
            <QuizPanel
              courseId={courseId}
              chapterId={showQuiz}
              onClose={() => setShowQuiz(null)}
              onPass={() => {
                toast.success("Quiz Passed!");
                fetchUserEnrolledCourses();
              }}
            />
          ) : playerData ? (
            <div>
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
                  onClick={() =>
                    markLectureAsCompleted(playerData.lectureId)
                  }
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
            </div>
          ) : (
            <div className="flex justify-center items-center w-full">
              <img
                src={courseData.courseThumbnail}
                alt="Course Thumbnail"
                className="rounded-lg shadow-lg max-h-[450px] object-cover"
              />
            </div>
          )}

          {/* Rating & Certificate */}
          <div className="border-t pt-8 mt-10">
            <div className="flex items-center gap-2 mb-5">
              <h1 className="text-xl font-bold">Rate this Course:</h1>
              <Rating initialRating={initialRating} onRate={handleRate} />
            </div>

            {isCourseCompleted && (
              <div className="text-center bg-green-50 border border-green-200 rounded-lg p-8 shadow-sm">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3">
                  You’ve successfully completed this course!
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
                  className={`mt-3 w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-medium text-lg rounded-lg hover:bg-green-700 transition-transform duration-500 hover:scale-105 ${
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

        <Footer />
      </div>
    </div>
  );
};

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
