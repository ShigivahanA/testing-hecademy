import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assets } from "../../assets/assets";

const Loading = () => {
  const { path } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (path) {
      const timer = setTimeout(() => {
        navigate(`/${path}`);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [path, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-cyan-100/70">
      <img
        src={assets.bookflip}
        alt="Book flipping animation"
        className="w-28 h-20 sm:w-36 sm:h-28 object-contain drop-shadow-lg"
      />

      {/* <p className="text-2xl sm:text-3xl font-semibold tracking-wide text-indigo-800 flex items-center gap-2">
        Loading your lessons
        <span className="flex gap-1">
          <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></span>
          <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-150"></span>
          <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-300"></span>
        </span>
      </p> */}

      {/* <div className="w-56 sm:w-72 h-2.5 bg-indigo-200 rounded-full overflow-hidden relative shadow-inner">
        <div className="h-full bg-gradient-to-r from-pink-400 via-indigo-500 to-blue-500 animate-[progress_5s_linear_forwards]"></div>
      </div> */}

      <style>
        {`
          @keyframes progress {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}
      </style>
    </div>
  );
};

export default Loading;
