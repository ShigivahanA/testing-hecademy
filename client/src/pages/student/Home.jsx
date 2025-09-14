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
  const { userData } = useContext(AppContext)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (userData && (!userData.preferences || !userData.preferences.topics?.length)) {
      setShowModal(true)
    }
  }, [userData])

  return (
    <div className="flex flex-col items-center space-y-7 text-center">
      {showModal && <PreferenceModal onClose={() => setShowModal(false)} />}
      <Hero />
      <Companies />
      <CoursesSection />
      <TestimonialsSection />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default Home;
