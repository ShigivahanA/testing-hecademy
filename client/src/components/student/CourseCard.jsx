import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'

const CourseCard = ({ course }) => {
  const { currency, calculateRating, enrolledCourses } = useContext(AppContext)

  const getCourseId = (id) => {
    if (!id) return ''
    if (typeof id === 'string') return id
    if (id.$oid) return id.$oid
    if (id.toString) return id.toString()
    if (id.buffer && id.buffer.data) return String(id.buffer.data.join(''))
    return String(id)
  }

  const courseId = getCourseId(course._id)

  // ✅ Check if this course is already enrolled
  const isEnrolled = enrolledCourses?.some(
    (enrolled) => getCourseId(enrolled._id) === courseId
  )

  return (
    <Link
      onClick={() => scrollTo(0, 0)}
      to={`/course/${courseId}`}
      className="bg-white relative border border-gray-500/30 pb-6 overflow-hidden rounded-xl hover:bg-gradient-to-b from-cyan-100/70 shadow-md transform transition-transform duration-300 hover:scale-105"
    >
      {/* Thumbnail */}
      <img className="w-full" src={course.courseThumbnail} alt="" />

      {/* ✅ Small 'Enrolled' tag (non-intrusive) */}
      {isEnrolled && (
        <div className="absolute top-2 right-2 bg-black text-white text-xs font-semibold px-2 py-1 rounded-md shadow-sm">
          Enrolled
        </div>
      )}

      {/* Content */}
      <div className="p-3 text-left space-y-2">
        <h3 className="text-base font-semibold">{course.courseTitle}</h3>
        {/* <p className="text-gray-500">{course.educator.name}</p> */}
        <div className="flex items-center space-x-2">
          <p>{calculateRating(course)}</p>
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <img
                key={i}
                className="w-3.5 h-3.5"
                src={
                  i < Math.floor(calculateRating(course))
                    ? assets.star
                    : assets.star_blank
                }
                alt=""
              />
            ))}
          </div>
          <p className="text-gray-500">
            ({course.courseRatings?.length || 0})
          </p>
        </div>
        <p className="text-base font-semibold text-gray-800">
          {currency}
          {(
            course.coursePrice -
            (course.discount * course.coursePrice) / 100
          ).toFixed(0)}
        </p>
      </div>
    </Link>
  )
}

export default CourseCard
