import React from 'react';
import { assets } from '../../assets/assets';
import SearchBar from '../../components/student/SearchBar';

const Hero = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full md:pt-36 pt-20 px-7 md:px-0 space-y-7 text-center bg-gradient-to-b from-cyan-100/70">
      <h1 className="md:text-home-heading-large text-home-heading-small relative font-bold text-gray-800 max-w-3xl mx-auto">
        Empower Your Future with Smarter,
        <span className="text-blue-600 inline-block hover:text-purple-600 hover:rotate-3 transition duration-500"> Personalized Learning.</span>
        <img src={assets.sketch} alt="sketch" className="md:block hidden absolute -bottom-7 right-0 " />
      </h1>
      <p className="md:block hidden text-gray-500 max-w-2xl mx-auto">
        At Hecademy, we tailor every course to your goals. With expert instructors, adaptive content, and real-time support, you’ll learn in the way that works best for you.
      </p>
      <p className="md:hidden text-gray-500 max-w-sm mx-auto">
        Your learning, your pace — with experts to help you succeed.
      </p>
      <SearchBar />
    </div>
  );
};

export default Hero;
