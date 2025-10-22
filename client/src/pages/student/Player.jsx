import React, { useContext, useEffect, useState  } from 'react'
import { AppContext } from '../../context/AppContext'
import YouTube from 'react-youtube';
import { assets } from '../../assets/assets';
import { useParams } from 'react-router-dom';
import humanizeDuration from 'humanize-duration';
import axios from 'axios';
import { toast } from 'react-toastify';
import Rating from '../../components/student/Rating';
import Footer from '../../components/student/Footer';
import Loading from '../../components/student/Loading';
import jsPDF from "jspdf"
import Discussion from '../../components/student/Discussion';

const Player = ({ }) => {

  const { enrolledCourses, backendUrl, getToken, calculateChapterTime, userData, fetchUserEnrolledCourses, generateCertificateForCourse, certificates,navigate,loadingUser } = useContext(AppContext)

  const { courseId } = useParams()
  const [courseData, setCourseData] = useState(null)
  const [progressData, setProgressData] = useState(null)
  const [openSections, setOpenSections] = useState({});
  const [playerData, setPlayerData] = useState(null);
  const [initialRating, setInitialRating] = useState(0);

  const getCourseData = () => {
    enrolledCourses.map((course) => {
      if (course._id === courseId) {
        setCourseData(course)
        course.courseRatings.map((item) => {
          if (item.userId === userData._id) {
            setInitialRating(item.rating)
          }
        })
      }
    })
  }

  const toggleSection = (index) => {
    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  useEffect(() => {
    if (!userData) return; 
    if (enrolledCourses.length > 0) {
      getCourseData();
    }
  }, [enrolledCourses, userData])

  useEffect(() => {
    if (!loadingUser && !userData) {
      navigate("/"); 
    }
  }, [userData, loadingUser, navigate]);

  const markLectureAsCompleted = async (lectureId) => {
  if (!userData || !courseData) return;

  try {
    const token = await getToken();
    if (!token) return;

    // ✅ find the lecture duration dynamically
    const lecture = courseData.courseContent
      .flatMap((ch) => ch.chapterContent)
      .find((lec) => lec.lectureId === lectureId);

    const lectureDuration = lecture?.lectureDuration || 0; // duration in minutes

    const { data } = await axios.post(
      backendUrl + "/api/user/update-course-progress",
      { courseId, lectureId, duration: lectureDuration }, // ✅ send duration too
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (data.success) {
      toast.success(data.message);
      getCourseProgress();
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error(error.message);
  }
};


  const getCourseProgress = async () => {
    if (!userData) return; 
    try {
      const token = await getToken();
      if (!token) return; 

      const { data } = await axios.post(backendUrl + '/api/user/get-course-progress',
        { courseId },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        setProgressData(data.progressData)
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }
  }

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

  const isCourseCompleted =
    progressData &&
    progressData.lectureCompleted.length ===
      courseData.courseContent.reduce(
        (total, chapter) => total + chapter.chapterContent.length,
        0
      );

  const handleRate = async (rating) => {
    if (!userData) return;
    try {
      const token = await getToken();
      if (!token) return;

      const { data } = await axios.post(backendUrl + '/api/user/add-rating',
        { courseId, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        fetchUserEnrolledCourses()
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (userData) {
      getCourseProgress();
    }
  }, [userData])

  useEffect(() => {
    if (isCourseCompleted && courseData && userData) {
      const alreadyHasCert = certificates.some(
        (c) => c.courseId._id === courseData._id
      );
      if (!alreadyHasCert) {
        generateCertificateForCourse(courseData, userData);
      }
    }
  }, [isCourseCompleted, courseData, userData, certificates]);

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
    )
  }

  if (!courseData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">Course not found or not enrolled.</p>
      </div>
    )
  }

  return courseData ? (
    <>
      {/* Responsive layout */}
      <div className="p-4 sm:p-6 lg:p-10 flex flex-col gap-10 lg:px-36">
        {/* LEFT: Course Structure */}
        <div className="text-gray-800 order-2">
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">Course Structure</h2>
          <div className="pt-5 space-y-2">
            {courseData && courseData.courseContent.map((chapter, index) => (
              <div key={index} className="border border-gray-300 bg-white rounded overflow-hidden">
                
                {/* Chapter Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                  onClick={() => toggleSection(index)}
                >
                  <div className="flex items-center gap-2">
                    <img src={assets.down_arrow_icon} alt="arrow" className={`w-4 h-4 transform transition-transform ${openSections[index] ? "rotate-180" : ""}`} />
                    <p className="font-medium text-sm sm:text-base md:text-lg">{chapter.chapterTitle}</p>
                  </div>
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-500">
                    {chapter.chapterContent.length} lectures • {calculateChapterTime(chapter)}
                  </p>
                </div>

                {/* Lectures */}
                <div className={`overflow-hidden transition-all duration-300 ${openSections[index] ? "max-h-[600px]" : "max-h-0"}`}>
                  <ul className="md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300 space-y-2">
                    {chapter.chapterContent.map((lecture, i) => (
                      <li key={i} className="flex items-start gap-2 py-1 text-xs sm:text-sm md:text-base">
                        <img
                          src={progressData &&
Array.isArray(progressData.lectureCompleted) &&
progressData.lectureCompleted.some((lec) => lec.lectureId === lecture.lectureId)
 ? assets.blue_tick_icon : assets.play_icon}
                          alt="bullet"
                          className="w-3 h-3 sm:w-4 sm:h-4 mt-1 flex-shrink-0"
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                          <p className="text-gray-800">{lecture.lectureTitle}</p>
                          <div className="flex gap-3 text-gray-600 text-[10px] sm:text-xs md:text-sm">
                            {lecture.lectureUrl && (
                              <p
                                onClick={() => {
                                    setPlayerData({ ...lecture, chapter: index + 1, lecture: i + 1 });

                                    // ✅ scroll to top of page after setting playerData
                                    setTimeout(() => {
                                      window.scrollTo({ top: 0, behavior: "smooth" });
                                    }, 100);
                                  }}
                                className="text-blue-500 cursor-pointer hover:underline"
                              >
                                Watch
                              </p>
                            )}
                            <p>{humanizeDuration(lecture.lectureDuration * 60 * 1000, { units: ['h', 'm'] })}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Rating + Certificate */}
          <div className="flex items-center gap-2 py-3 mt-10">
            <h1 className="text-xl font-bold">Rate this Course:</h1>
            <Rating initialRating={initialRating} onRate={handleRate} />
          </div>

          {isCourseCompleted && (
            <div className="mt-6 text-center bg-green-50 border border-green-200 rounded-lg p-6 shadow-sm">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">
                You have successfully completed the course
              </h1>
              <div className="relative min-h-[50px] flex justify-center items-center">
                <p className={`absolute transition-opacity duration-500 ${certificates.find(c => c.courseId._id === courseData._id) ? "opacity-0" : "opacity-100"}`}>
                  Generating your certificate... please wait
                </p>
                <button
                  onClick={() => {
                    const cert = certificates.find(c => c.courseId._id === courseData._id);
                    if (cert) downloadCertificatePDF(courseData, userData, cert);
                  }}
                  disabled={!certificates.find(c => c.courseId._id === courseData._id)}
                  className={`w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-medium text-lg rounded-lg hover:bg-green-700 transition-all duration-500 transform hover:scale-105 ${certificates.find(c => c.courseId._id === courseData._id) ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                >
                  Download Certificate
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Video Player */}
        <div className="lg:mt-10 order-1" id="video-player">
          {playerData ? (
            <div>
              <YouTube iframeClassName="w-full aspect-video rounded-lg shadow" videoId={playerData.lectureUrl.split('/').pop()} />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 gap-2">
                <p className="text-sm sm:text-base md:text-lg font-medium">
                  {playerData.chapter}.{playerData.lecture} {playerData.lectureTitle}
                </p>
                <button onClick={() => markLectureAsCompleted(playerData.lectureId)} className="text-blue-600 text-sm sm:text-base">
                  {progressData &&
progressData.lectureCompleted?.some(
  (lec) => lec.lectureId === playerData.lectureId
) ? 'Completed' : 'Mark Complete'}
                </button>
              </div>
            </div>
          ) : (
            <img src={courseData ? courseData.courseThumbnail : ''} alt="" className="rounded-lg shadow" />
          )}
        </div>
      </div>
      <Discussion courseId={courseId} />

      <Footer />
    </>
  ) : <Loading />
}

export default Player
