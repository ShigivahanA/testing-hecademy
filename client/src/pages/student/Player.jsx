import React, { useContext, useEffect, useState } from 'react'
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

const Player = ({ }) => {

  const { enrolledCourses, backendUrl, getToken, calculateChapterTime, userData, fetchUserEnrolledCourses, issueCertificate } = useContext(AppContext)

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
  

  const markLectureAsCompleted = async (lectureId) => {

      if (!userData) return;
          try {
            const token = await getToken();
            if (!token) return;

      const { data } = await axios.post(backendUrl + '/api/user/update-course-progress',
        { courseId, lectureId },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        getCourseProgress()
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }

  }

  const getCourseProgress = async () => {

    if (!userData) return; // 👈 stop if logged out
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


const generateCertificate = (cert) => {
  const userName = userData?.name || "Student";
  const courseName = courseData?.courseTitle || "Unnamed Course";
  const issueDate = new Date(cert.issueDate).toLocaleDateString();
  const verifyLink = `${window.location.origin}/verify/${cert.certificateId}`;

  const doc = new jsPDF("landscape", "pt", "a4"); // A4 landscape

  // Use your uploaded template as background
  doc.addImage(assets.certificateTemplate, "PNG", 0, 0, 842, 595);

  // Student Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(userName, 478, 265, { align: "center" });

  // Course Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(courseName, 475, 355, { align: "center" });

  // Issue Date
  doc.setFont("helvetica", "italic");
  doc.setFontSize(14);
  doc.text(issueDate, 270, 47, { align: "center" });

  // Verification Link
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Verify here: ${verifyLink}`, 475, 425, { align: "center" });
  // Save file
  doc.save(`${userName}_${courseName}_certificate.pdf`);
  toast.success("Certificate downloaded!");
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
    
    <div className='p-4 sm:p-10 flex flex-col-reverse md:grid md:grid-cols-2 gap-10 md:px-36' >
      <div className=" text-gray-800" >
        <h2 className="text-xl font-semibold">Course Structure</h2>
        <div className="pt-5">
          {courseData && courseData.courseContent.map((chapter, index) => (
            <div key={index} className="border border-gray-300 bg-white mb-2 rounded">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                onClick={() => toggleSection(index)}
              >
                <div className="flex items-center gap-2">
                  <img src={assets.down_arrow_icon} alt="arrow icon" className={`transform transition-transform ${openSections[index] ? "rotate-180" : ""}`} />
                  <p className="font-medium md:text-base text-sm">{chapter.chapterTitle}</p>
                </div>
                <p className="text-sm md:text-default">{chapter.chapterContent.length} lectures - {calculateChapterTime(chapter)}</p>
              </div>

              <div className={`overflow-hidden transition-all duration-300 ${openSections[index] ? "max-h-96" : "max-h-0"}`} >
                <ul className="list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300">
                  {chapter.chapterContent.map((lecture, i) => (
                    <li key={i} className="flex items-start gap-2 py-1">
                      <img src={progressData && progressData.lectureCompleted.includes(lecture.lectureId) ? assets.blue_tick_icon : assets.play_icon} alt="bullet icon" className="w-4 h-4 mt-1" />
                      <div className="flex items-center justify-between w-full text-gray-800 text-xs md:text-default">
                        <p>{lecture.lectureTitle}</p>
                        <div className='flex gap-2'>
                          {lecture.lectureUrl && <p onClick={() => setPlayerData({ ...lecture, chapter: index + 1, lecture: i + 1 })} className='text-blue-500 cursor-pointer'>Watch</p>}
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

        <div className=" flex items-center gap-2 py-3 mt-10">
          <h1 className="text-xl font-bold">Rate this Course:</h1>
          <Rating initialRating={initialRating} onRate={handleRate} />
        </div>
        {isCourseCompleted && (
            <div className="mt-6 text-center bg-green-50 border border-green-200 rounded-lg p-6 shadow-sm">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">
                You have successfully completed the course
              </h1>
              <h1 className="text-base sm:text-lg text-gray-600 mb-6">
                Claim your certificate by clicking the button below!
              </h1>
              <button
                onClick={async () => {
    const cert = await issueCertificate(courseData._id);
    if (cert) generateCertificate(cert);
  }}
                className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-medium text-lg rounded-lg hover:bg-green-700 transition"
              >
                Download Certificate
              </button>
            </div>
        )}


      </div>

      <div className='md:mt-10'>
        {
          playerData
            ? (
              <div>
                <YouTube iframeClassName='w-full aspect-video' videoId={playerData.lectureUrl.split('/').pop()} />
                <div className='flex justify-between items-center mt-1'>
                  <p className='text-xl '>{playerData.chapter}.{playerData.lecture} {playerData.lectureTitle}</p>
                  <button onClick={() => markLectureAsCompleted(playerData.lectureId)} className='text-blue-600'>{progressData && progressData.lectureCompleted.includes(playerData.lectureId) ? 'Completed' : 'Mark Complete'}</button>
                </div>
              </div>
            )
            : <img src={courseData ? courseData.courseThumbnail : ''} alt="" />
        }
      </div>
    </div>
    <Footer />
    </>
  ) : <Loading />
}

export default Player