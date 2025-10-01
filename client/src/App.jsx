import React, { useEffect, useState } from 'react'
import { Routes, Route, useMatch } from 'react-router-dom'
import Navbar from './components/student/Navbar'
import Home from './pages/student/Home'
import CourseDetails from './pages/student/CourseDetails'
import CoursesList from './pages/student/CoursesList'
import Dashboard from './pages/educator/Dashboard'
import AddCourse from './pages/educator/AddCourse'
import MyCourses from './pages/educator/MyCourses'
import StudentsEnrolled from './pages/educator/StudentsEnrolled'
import Educator from './pages/educator/Educator'
import 'quill/dist/quill.snow.css'
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify'
import Player from './pages/student/Player'
import MyEnrollments from './pages/student/MyEnrollments'
import Loading from './components/student/Loading'

const App = () => {
  const isEducatorRoute = useMatch('/educator/*')
  const [showLoader, setShowLoader] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true) 
      setTimeout(() => setShowLoader(false), 600) 
    }, 1500) 
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="text-default min-h-screen bg-white relative">
      <ToastContainer />
      {showLoader && (
        <div
          className={`fixed inset-0 z-50 bg-white flex items-center justify-center transition-opacity duration-600 ${
            fadeOut ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <Loading />
        </div>
      )}
      {/* App Content */}
      <div className={`${showLoader ? 'opacity-0' : 'opacity-100 animate-fadeIn'}`}>
      {!isEducatorRoute && <Navbar />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/course/:id" element={<CourseDetails />} />
          <Route path="/course-list" element={<CoursesList />} />
          <Route path="/course-list/:input" element={<CoursesList />} />
          <Route path="/my-enrollments" element={<MyEnrollments />} />
          <Route path="/player/:courseId" element={<Player />} />
          <Route path="/loading/:path" element={<Loading />} />
          <Route path="/educator" element={<Educator />}>
            <Route path="/educator" element={<Dashboard />} />
            <Route path="add-course" element={<AddCourse />} />
            <Route path="my-courses" element={<MyCourses />} />
            <Route path="student-enrolled" element={<StudentsEnrolled />} />
          </Route>
          <Route path="/verify/:id" element={<VerifyCertificate backendUrl={backendUrl} />} />
        </Routes>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.6s ease-out;
          }
        `}
      </style>
    </div>
  )
}

export default App
