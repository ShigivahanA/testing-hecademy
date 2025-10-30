import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/student/Footer";
import { assets } from "../../assets/assets";

const NotFound = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <div className="relative min-h-screen flex flex-col justify-center items-center text-center px-6">
        {/* 🌈 Gradient background line */}
        <div className="absolute inset-x-0 top-0 h-[40vh] bg-gradient-to-b from-cyan-100/70 via-white to-transparent" />

        {/* Content */}
        <div className="z-10 flex flex-col items-center max-w-lg">

          <h1 className="text-5xl font-bold text-gray-800 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-3">
            Page Not Found
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Oops! The page you’re looking for doesn’t exist or might have been
            moved. Let’s get you back on track!
          </p>

          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-md"
          >
            Go Back Home
          </button>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default NotFound;
