import React from 'react';
import { assets } from '../../assets/assets';

const Footer = () => {
  return (
    <footer className="flex md:flex-row flex-col-reverse items-center justify-between text-left w-full px-8 border-t">
  <div className='flex items-center gap-4'>
    <img className='hidden md:block w-20' src={assets.logo} alt="logo" />
    <div className='hidden md:block h-7 w-px bg-gray-500/60'></div>
    <div className="py-4 text-center text-xs md:text-sm text-gray-500 flex flex-col md:flex-row items-center gap-1">
      <p>Copyright 2025 © Hecademy. All Rights Reserved.</p>
      <span className="hidden md:inline-block mx-2">|</span>
      <p>
        Created with <span className='text-gray-700 font-medium'>❤️</span> by{" "}
        <span className="text-gray-700 font-medium">Jaianandakrishnaa K</span>,{" "}
        <span className="text-gray-700 font-medium">Shigivahan A</span>, and{" "}
        <span className="text-gray-700 font-medium">Charan Vivek Raj R</span>
      </p>
    </div>
  </div>
  <div className='flex items-center gap-3 max-md:mt-4'>
    <a href="#">
      <img src={assets.facebook_icon} alt="facebook_icon" />
    </a>
    <a href="#">
      <img src={assets.twitter_icon} alt="twitter_icon" />
    </a>
    <a href="#">
      <img src={assets.instagram_icon} alt="instagram_icon" />
    </a>
  </div>
</footer>

  );
};

export default Footer;