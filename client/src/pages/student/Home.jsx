import React, { useContext, useEffect, useState } from 'react';
import Footer from '../../components/student/Footer';
import Hero from '../../components/student/Hero';
import Companies from '../../components/student/Companies';
import CoursesSection from '../../components/student/CoursesSection';
import TestimonialsSection from '../../components/student/TestimonialsSection';
import CallToAction from '../../components/student/CallToAction';
import { AppContext } from '../../context/AppContext';
import PreferenceModal from '../../components/student/PreferenceModal';

const Home = () => {
  const { userData, isEducator } = useContext(AppContext)
  const [showModal, setShowModal] = useState(false)
  useEffect(() => {
      window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    if (
      userData && 
      !isEducator && 
      (!userData.preferences || !userData.preferences.topics?.length)
    ) {
      setShowModal(true)
    }
  }, [userData, isEducator])

  return (
    <>
    {showModal && !isEducator && (
        <PreferenceModal onClose={() => setShowModal(false)} />
      )}
    <div className="flex flex-col items-center space-y-7 text-center">
      <Hero />
      <Companies />
      <CoursesSection />
      <TestimonialsSection />
      <CallToAction />
      <Footer />
    </div>
    </>
  );
};

export default Home;
