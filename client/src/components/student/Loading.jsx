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
    <div className="fixed inset-0 w-full h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-[#e1fcfe] to-white z-50">
      <img
        src={assets.bookflip}
        alt="Book flipping animation"
        className="w-28 h-20 sm:w-36 sm:h-28 object-contain drop-shadow-lg animate-pulse"
      />
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
