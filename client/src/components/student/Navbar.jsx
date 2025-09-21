import React, { useContext } from 'react';
import { assets } from '../../assets/assets';
import { Link, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { useClerk, UserButton, useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const Navbar = () => {

  const location = useLocation();

  const isCoursesListPage = location.pathname.includes('/course-list');

  const { backendUrl, isEducator, setIsEducator, navigate, getToken } = useContext(AppContext)

  const { openSignIn } = useClerk()
  const { user } = useUser()

  const becomeEducator = async () => {

    try {

      if (isEducator) {
        navigate('/educator')
        return;
      }

      const token = await getToken()
      const { data } = await axios.get(backendUrl + '/api/educator/update-role', { headers: { Authorization: `Bearer ${token}` } })
      if (data.success) {
        toast.success(data.message)
        setIsEducator(true)
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
     <div
    className={`max-w-screen-xl mx-auto flex items-center justify-between px-6 sm:px-10 md:px-14 lg:px-20 py-4 
    rounded-lg shadow-md transition-all duration-300
    ${isCoursesListPage 
      ? 'bg-white backdrop-blur-md border border-gray-200' 
      : 'bg-cyan-100/70 backdrop-blur-md border border-gray-200'
    }`}
  >
      <img onClick={() => navigate('/')} src={assets.logo} alt="Logo" className="w-28 lg:w-32 cursor-pointer" />
      <div className="md:flex hidden items-center gap-5 text-gray-500">
        <div className="flex items-center gap-5">
          {
            user && (
            <>
            {isEducator &&( 
              <>
              <button onClick={becomeEducator}>Educator Dashboard</button>
              <span className='mx-2'> | </span>
              </>
            )}
            <Link to='/my-enrollments' >My Enrollments</Link>
            </>
            )
          }
        </div>
        {user
          ? <UserButton />
          : <button onClick={() => openSignIn()} className="bg-blue-600 text-white px-5 py-2 rounded-full border-[0.5px] border-gray-400 hover:-translate-x-2 duration-500 hover:shadow-[4px_4px_0_#000]">
            Create Account
          </button>}
      </div>
      {/* For Phone Screens */}
      <div className='md:hidden flex items-center gap-2 sm:gap-5 text-gray-500'>
        <div className="flex items-center gap-1 sm:gap-2 max-sm:text-xs">
          {user && (
      <>
        {isEducator && (
          <>
            <button onClick={becomeEducator}>Educator Dashboard</button>
            <span className="mx-1">|</span>
          </>
        )}
        <Link to="/my-enrollments">My Enrollments</Link>
      </>
    )}
        </div>
        {user
          ? <UserButton />
          : <button onClick={() => openSignIn()}>
            <img src={assets.user_icon} alt="" />
          </button>}
      </div>
    </div>
  );
};

export default Navbar;