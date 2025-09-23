import React, { useContext, useEffect, useState } from 'react'
import Footer from '../../components/student/Footer'
import { assets } from '../../assets/assets'
import CourseCard from '../../components/student/CourseCard'
import { AppContext } from '../../context/AppContext'
import { useParams } from 'react-router-dom'
import SearchBar from '../../components/student/SearchBar'
import Loading from '../../components/student/Loading'

const CoursesList = () => {
  const { input } = useParams()
  const { allCourses, navigate, backendUrl, userData, recommendations, fetchRecommendations, isEducator } = useContext(AppContext)

  const [filteredCourse, setFilteredCourse] = useState([])
  const [recommended, setRecommended] = useState([])
  const [loading, setLoading] = useState(true) // 👈 added loading state

  // ✅ Filter course list based on search input
  useEffect(() => {
    if (allCourses && allCourses.length > 0) {
      const tempCourses = allCourses.slice()
      const updated = input
        ? tempCourses.filter(item =>
            item.courseTitle.toLowerCase().includes(input.toLowerCase())
          )
        : tempCourses

      setFilteredCourse(updated)

      // ⏳ keep loader visible for 2 seconds
      const timer = setTimeout(() => {
        setLoading(false)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [allCourses, input])

  useEffect(() => {
    if (fetchRecommendations) {
      fetchRecommendations()
    }
  }, [fetchRecommendations])

  if (loading) {
    return <Loading /> // 👈 show loading first
  }

  return (
    <>
      <div className="relative md:px-36 px-8 pt-20 text-left">
        {/* Header */}
        <div className="flex md:flex-row flex-col gap-6 items-start justify-between w-full">
          <div>
            <h1 className="text-4xl font-semibold text-gray-800">Course List</h1>
            <p className="text-gray-500">
              <span onClick={() => navigate('/')} className="text-blue-600 cursor-pointer">
                Home
              </span>{' '}
              / <span>Course List</span>
            </p>
          </div>
          <SearchBar data={input} />
        </div>

        {/* Search Filter Chip */}
        {input && (
          <div className="inline-flex items-center gap-4 px-4 py-2 border mt-8 -mb-8 text-gray-600">
            <p>{input}</p>
            <img
              onClick={() => navigate('/course-list')}
              className="cursor-pointer"
              src={assets.cross_icon}
              alt=""
            />
          </div>
        )}
        {/* ✅ Recommendations Only if User is Logged In */}
        {userData && !isEducator ? (
          recommendations && (
            <div className="my-16">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                Recommended for You
              </h2>

              {recommendations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-2 md:p-0">
                  {recommendations.map((course, index) => (
                    <CourseCard key={course._id || index} course={course} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-lg">
                  No recommended courses based on your interests. Please explore our course list.
                </p>
              )}
            </div>
          )
        ) : null}

        {/* ✅ Normal Course List */}
        <div className="my-16">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            {userData && !isEducator ? "Courses You Might Like" : "Courses in Hecademy"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-2 md:p-0">
            {filteredCourse.map((course, index) => (
              <CourseCard key={index} course={course} />
            ))}
          </div>
        </div>

      </div>
      <Footer />
    </>
  )
}

export default CoursesList
