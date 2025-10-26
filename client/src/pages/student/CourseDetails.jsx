import React, { useContext, useEffect, useState } from 'react';
import Footer from '../../components/student/Footer';
import { assets } from '../../assets/assets';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';
import { toast } from 'react-toastify';
import humanizeDuration from 'humanize-duration'
import YouTube from 'react-youtube';
import { useAuth, useUser } from '@clerk/clerk-react';
import Loading from '../../components/student/Loading';

const CourseDetails = () => {

  const { id } = useParams()
  const { user } = useUser();


  const [courseData, setCourseData] = useState(null)
  const [playerData, setPlayerData] = useState(null)
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false)
  const [reviewUsers, setReviewUsers] = useState({});


  const { backendUrl, currency, userData, calculateChapterTime, calculateCourseDuration, calculateRating, calculateNoOfLectures, isEducator, } = useContext(AppContext)
  const { getToken } = useAuth()

  const fetchCourseData = async () => {

    try {

      const { data } = await axios.get(backendUrl + '/api/course/' + id)

      if (data.success) {
        setCourseData(data.courseData)
      } else {
        toast.error(data.message)
      }

    } catch (error) {

      toast.error(error.message)

    }

  }

  useEffect(() => {
  const fetchReviewUsers = async () => {
    if (!courseData || !courseData.courseRatings?.length) return;

    const userIds = courseData.courseRatings
      .map(r => r.userId)
      .filter(Boolean);

    if (userIds.length === 0) return;

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/get-users-by-ids`,
        { userIds }
      );

      if (data.success) {
        // Convert array to map { userId: {name, imageUrl} }
        const userMap = {};
        data.users.forEach(u => {
          userMap[u._id] = u;
        });
        setReviewUsers(userMap);
      }
    } catch (err) {
      console.error("Error fetching reviewer details:", err.message);
    }
  };

  fetchReviewUsers();
}, [courseData]);


  const [openSections, setOpenSections] = useState({});

  const toggleSection = (index) => {
    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };


  const enrollCourse = async () => {

    try {

      if (!userData) {
        return toast.warn('Login to Enroll')
      }

      if (isAlreadyEnrolled) {
        return toast.warn('Already Enrolled')
      }
      if (isEducator) {
              return toast.warn('Already Enrolled')
            }

      const token = await getToken();

      const { data } = await axios.post(backendUrl + '/api/user/purchase',
        { courseId: courseData._id },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        const { session_url } = data
        window.location.replace(session_url)
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchCourseData()
  }, [])

  useEffect(() => {

    if (userData && courseData) {
      setIsAlreadyEnrolled(userData.enrolledCourses.includes(courseData._id))
    }

  }, [userData, courseData])

  return courseData ? (
    <>
    <div className="relative w-full overflow-x-hidden">
      <div className="container mx-auto px-6 md:px-12 lg:px-20 xl:px-28 pt-10 lg:pt-20 flex flex-col-reverse lg:flex-row gap-10 items-start justify-between text-left">
        <div className="absolute top-0 left-0 w-full h-section-height -z-1 bg-gradient-to-b from-cyan-100/70"></div>

        <div className="flex-1 max-w-2xl z-10 text-gray-500 flex flex-col justify-between">
          <h1 className="md:text-course-deatails-heading-large text-course-deatails-heading-small font-semibold text-gray-800">
            {courseData.courseTitle}
          </h1>
          <p className="pt-4 md:text-base text-sm" dangerouslySetInnerHTML={{__html: courseData.courseDescription.split(".")[0] + "."}}>
          </p>

          <div className='flex items-center space-x-2 pt-3 pb-1 text-sm'>
            <p>{calculateRating(courseData)}</p>
            <div className='flex'>
              {[...Array(5)].map((_, i) => (<img key={i} src={i < Math.floor(calculateRating(courseData)) ? assets.star : assets.star_blank} alt=''
                className='w-3.5 h-3.5' />
              ))}
            </div>
            <p className='text-blue-600'>({courseData.courseRatings.length} {courseData.courseRatings.length > 1 ? 'ratings' : 'rating'})</p>

            <p>{courseData.enrolledStudents.length} {courseData.enrolledStudents.length > 1 ? 'students' : 'student'}</p>
          </div>

          <p className='text-sm'>Course by <span className='text-blue-600 underline'>{courseData.educator.name}</span></p>

          <div className="pt-8 text-gray-800">
            <h2 className="text-xl font-semibold">Course Structure</h2>
            <div className="pt-5">
              {courseData.courseContent.map((chapter, index) => (
                <div key={index} className="border border-gray-300 bg-white mb-2 rounded-lg">
                  <div
                      className="flex flex-col md:flex-row md:items-center md:justify-between px-4 py-3 cursor-pointer select-none gap-2"
                    onClick={() => toggleSection(index)}
                  >
                    <div className="flex items-center gap-2">
                      <img src={assets.down_arrow_icon} alt="arrow icon" className={`transform transition-transform ${openSections[index] ? "rotate-180" : ""}`} />
                      <p className="font-medium md:text-base text-sm">{chapter.chapterTitle}</p>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 whitespace-nowrap">{chapter.chapterContent.length} lectures - {calculateChapterTime(chapter)}</p>
                  </div>

                  <div className={`overflow-hidden transition-all duration-300 ${openSections[index] ? "max-h-96" : "max-h-0"}`} >
                    <ul className="list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300">
                      {chapter.chapterContent.map((lecture, i) => (
                        <li key={i} className="flex items-start gap-2 py-1">
                          <img src={assets.play_icon} alt="bullet icon" className="w-4 h-4 mt-1" />
                          <div className="flex items-center justify-between w-full text-gray-800 text-xs md:text-default">
                            <p>{lecture.lectureTitle}</p>
                            <div className='flex gap-2'>
                              {lecture.isPreviewFree && <p onClick={() => {
                                      setPlayerData({ videoId: lecture.lectureUrl.split('/').pop() });
                                      setTimeout(() => {
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }, 100);
                                    }}
                                    className="text-blue-500 cursor-pointer">Preview</p>}
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
          </div>

          <div className="py-20 text-sm md:text-default">
            <h3 className="text-xl font-semibold text-gray-800">Course Description</h3>
            <p className="rich-text pt-3 text-justify space-y-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: courseData.courseDescription }}>
            </p>
            {courseData.courseRatings && courseData.courseRatings.length > 0 && (
  <div className="mt-10">
    <h3 className="text-xl font-semibold text-gray-800 mb-4">
      What Learners Say
    </h3>

    <div className="space-y-4">
      {courseData.courseRatings
        .filter((r) => r.feedback && r.feedback.trim() !== "")
        .map((r, i) => {
          const reviewer = reviewUsers[r.userId];
          return (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src={
                      reviewer?.imageUrl ||
                      assets.profile_icon
                    }
                    alt="user"
                    className="w-8 h-8 rounded-full border object-cover"
                  />
                  <p className="font-medium text-gray-700">
                    {reviewer?.name || "Anonymous User"}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  {r.date ? new Date(r.date).toLocaleDateString() : ""}
                </p>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed italic">
                “{r.feedback}”
              </p>
            </div>
          );
        })}
    </div>
  </div>
)}
          </div>
        </div>

        <div className="w-full lg:max-w-course-card z-10 shadow-custom-card rounded-xl overflow-hidden bg-white">
          {
           playerData
                      ? (
                        <YouTube
                            videoId={playerData.videoId}
                            opts={{ playerVars: { autoplay: 1, mute:1 } }}
                            iframeClassName="w-full aspect-video"
                            onReady={(event) => {
                              const player = event.target;
                              let intervalId = setInterval(() => {
                                if (player.getCurrentTime && player.getCurrentTime() >= 180) { // 3 mins
                                  player.pauseVideo();
                                  toast.info("⏳ Preview limit reached! Enroll to watch full lecture.");

                                  clearInterval(intervalId); // ✅ stop interval
                                  setPlayerData(null);       // ✅ reset preview -> show thumbnail again
                                }
                              }, 1000);
                            }}
                          />
                      )
                      : <img src={courseData.courseThumbnail} alt="" />

          }
          <div className="p-5">
            <div className="flex items-center gap-2">
              <img className="w-3.5" src={assets.time_left_clock_icon} alt="time left clock icon" />
              <p className="text-red-500">
                <span className="font-medium">5 days</span> left at this price!
              </p>
            </div>
            <div className="flex gap-3 items-center pt-2">
              <p className="text-gray-800 md:text-4xl text-2xl font-semibold">{currency}{(courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2)}</p>
              <p className="md:text-lg text-gray-500 line-through">{currency}{courseData.coursePrice}</p>
              <p className="md:text-lg text-gray-500">{courseData.discount}% off</p>
            </div>
            <div className="flex flex-wrap items-center text-xs sm:text-sm md:text-default gap-x-4 gap-y-2 pt-2 md:pt-4 text-gray-500">
              <div className="flex items-center gap-1">
                <img src={assets.star} alt="star icon" className="w-3 h-3 sm:w-4 sm:h-4" />
                <p>{calculateRating(courseData)}</p>
              </div>
              <div className="h-4 w-px bg-gray-500/40 hidden sm:block"></div>
              <div className="flex items-center gap-1">
                <img src={assets.time_clock_icon} alt="clock icon" className="w-3 h-3 sm:w-4 sm:h-4" />
                <p>{calculateCourseDuration(courseData)}</p>
              </div>
              <div className="h-4 w-px bg-gray-500/40 hidden sm:block"></div>
              <div className="flex items-center gap-1">
                <img src={assets.lesson_icon} alt="lesson icon" className="w-3 h-3 sm:w-4 sm:h-4" />
                <p>{calculateNoOfLectures(courseData)} lessons</p>
              </div>
            </div>
            {!isEducator && (
              <button
                onClick={enrollCourse}
                className="md:mt-6 mt-4 w-full py-3 rounded bg-blue-600 text-white font-medium"
              >
                {isAlreadyEnrolled ? "Already Enrolled" : "Enroll Now"}
              </button>
              )}
            <div className="pt-6">
              <p className="md:text-xl text-lg font-medium text-gray-800">What's in the course?</p>
              <ul className="ml-4 pt-2 text-sm md:text-default list-disc text-gray-500">
                <li>Lifetime access with free updates.</li>
                <li>Step-by-step, hands-on project guidance.</li>
                <li>Downloadable resources and source code.</li>
                <li>Quizzes to test your knowledge.</li>
                <li>Certificate of completion.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      </div>
            <Footer />
    </>
  ) : <Loading />
};

export default CourseDetails;