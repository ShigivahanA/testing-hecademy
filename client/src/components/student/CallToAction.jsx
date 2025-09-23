import React,{useContext} from 'react'
import { assets } from '../../assets/assets'
import { useClerk, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../../context/AppContext'

const CallToAction = () => {
  const { openSignIn } = useClerk()
  const { isSignedIn } = useUser() 
  const { isEducator } = useContext(AppContext)
  const navigate = useNavigate()

  const handleGetStarted = () => {
    if (!isSignedIn) {
      openSignIn() // ✅ case 1: not logged in
    } else if (isEducator) {
      navigate('/educator') 
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/my-enrollments')
      window.scrollTo({ top: 0, behavior: 'smooth' }) 
    }
  }

  
  const handleLearnMore = () => {
    navigate('/course-list') // always show course list
  }

  return (
    <div className='flex flex-col items-center gap-4 pt-10 pb-24 px-8 md:px-0'>
      <h1 className='md:text-4xl text-xl text-gray-800 font-semibold'>Learn Anything. Anytime. Your Way.</h1>
      <p className='text-gray-500 sm:text-sm'>With Hecademy, you’re in control of your learning. Whether you’re a beginner or advancing your career, access flexible courses built around your strengths, interests, and schedule.</p>
      <div className='flex items-center font-medium gap-6 mt-4'>
        <button onClick={handleGetStarted} className='px-10 py-3 rounded-xl text-white bg-blue-600 border-[0.5px] border-gray-400 hover:-translate-x-1 duration-500 hover:shadow-[4px_4px_0_#000]'>Get started</button>
        <button onClick={handleLearnMore} className='flex items-center gap-2 hover:text-blue-600'>
          Explore more →
          {/* <img src={assets.arrow_icon} alt="arrow_icon" /> */}
        </button>
      </div>
    </div>
  )
}

export default CallToAction