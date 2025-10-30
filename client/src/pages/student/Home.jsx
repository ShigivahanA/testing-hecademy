import React, { useContext, useEffect, useState } from "react";
import Footer from "../../components/student/Footer";
import Hero from "../../components/student/Hero";
import Companies from "../../components/student/Companies";
import CoursesSection from "../../components/student/CoursesSection";
import TestimonialsSection from "../../components/student/TestimonialsSection";
import CallToAction from "../../components/student/CallToAction";
import { AppContext } from "../../context/AppContext";
import PreferenceModal from "../../components/student/PreferenceModal";
import TracksSection from "../../components/student/TracksSection";
import Loading from "../../components/student/Loading";

const Home = () => {
  const { userData, isEducator } = useContext(AppContext);
  const [showModal, setShowModal] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // 🧭 Scroll to top + simulate loading delay
  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => setPageLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // 🎯 Show preference modal if user has no topics set
  useEffect(() => {
    if (
      userData &&
      !isEducator &&
      (!userData.preferences || !userData.preferences.topics?.length)
    ) {
      setShowModal(true);
    }
  }, [userData, isEducator]);

  // 🌀 Show loading screen
  if (pageLoading) {
    return <Loading />;
  }

  // 🏠 Main Home Layout
  return (
    <>
      {showModal && !isEducator && (
        <PreferenceModal onClose={() => setShowModal(false)} />
      )}

      <div className="flex flex-col items-center space-y-7 text-center">
        <Hero />
        <Companies />
        <CoursesSection />
        <TracksSection />
        <TestimonialsSection />
        <CallToAction />
        <Footer />
      </div>
    </>
  );
};

export default Home;
