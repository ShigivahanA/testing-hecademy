import React, { useState } from 'react';
import { assets } from '../../assets/assets';
import { useNavigate } from "react-router-dom";

const Footer = () => {

  const [result, setResult] = useState("");
  const navigate = useNavigate();

  // Auto clear result after 5s
  setTimeout(() => {
    setResult("");
  }, 5000);

  const onSubscribe = async (event) => {
    event.preventDefault();
    setResult("Subscribing...");
    const formData = new FormData(event.target);

    // Add Web3Forms access key
    formData.append("access_key", "1f07a246-8e45-494d-9e60-ceb5c03925fc");

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      setResult("Subscribed successfully 🎉");
      event.target.reset();
    } else {
      console.log("Error", data);
      setResult("Something went wrong. Try again!");
    }
  };
  return (
    <footer className="bg-black md:px-36 text-left w-full mt-10">
      <div className="flex flex-col md:flex-row items-start px-8 md:px-0 justify-center gap-10 md:gap-32 py-10 border-b border-white/30">

        <div className="flex flex-col md:items-start items-center w-full">
          <img src={assets.logo_dark} alt="logo" className="w-28 sm:w-32 md:w-40 lg:w-44 h-auto object-contain"/>
          <p className="mt-6 text-center md:text-justify text-sm text-white/80">
            Hecademy combines expert teaching and smart technology to make learning truly yours.
          </p>
        </div>

        <div className="flex flex-col md:items-start items-center w-full">
          <h2 className="font-semibold text-white mb-5">Quick Links</h2>
          <ul className="flex flex-wrap justify-center md:flex-col w-full text-xs sm:text-sm text-white/80 md:space-y-2 underline gap-3 md:gap-0">
  <li>
    <button onClick={() => navigate("/")} className="hover:text-cyan-400 transition">
      Home
    </button>
  </li>
  <li>
    <button onClick={() => navigate("/about")} className="hover:text-cyan-400 transition">
      About Us
    </button>
  </li>
  <li>
    <button onClick={() => navigate("/contact")} className="hover:text-cyan-400 transition">
      Contact Us
    </button>
  </li>
  <li>
    <button onClick={() => navigate("/privacy-policy")} className="hover:text-cyan-400 transition">
      Privacy Policy
    </button>
  </li>
</ul>
        </div>

        <div
          className="flex flex-col items-start w-full"
        >
          <h2 className="font-semibold text-white mb-5">
            Subscribe to our newsletter
          </h2>
          <p className="text-sm text-white/80">
            The latest news, articles, and resources, sent to your inbox weekly.
          </p>
          <form
            onSubmit={onSubscribe}
            className="flex items-center gap-2 pt-4 w-full"
          >
            <input
              className="flex-1 border border-gray-500/30 bg-gray-800 text-gray-200 placeholder-gray-500 outline-none h-9 rounded px-3 text-sm"
              type="email"
              placeholder="Enter your email"
              name="email"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 w-28 h-9 text-white rounded"
            >
              Subscribe
            </button>
          </form>

          {/* Subscribe result */}
          {result && (
            <p
              className={`mt-3 text-sm font-medium transition duration-500 ${
                result.includes("success")
                  ? "text-green-500"
                  : result.includes("Subscribing")
                  ? "text-blue-400 animate-pulse"
                  : "text-red-500"
              }`}
            >
              {result}
            </p>
          )}
        </div>

      </div>
      <div className="py-4 text-center text-xs md:text-sm text-white/60 flex flex-col md:flex-row justify-center items-center gap-1">
        <p>Copyright 2025 © Hecademy. All Rights Reserved.</p>
        <span className="hidden md:inline-block mx-2">|</span>
        <p>
          Created with <span className='text-white font-medium'>❤️</span> by{" "}
          <span className="text-white font-medium">Jaianandakrishnaa K</span>,{" "}
          <span className="text-white font-medium">Shigivahan A</span>, and{" "}
          <span className="text-white font-medium">Charan Vivek Raj R</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
