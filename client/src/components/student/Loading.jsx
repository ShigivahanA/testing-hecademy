import { useEffect,useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assets, motivationalLines } from "../../assets/assets";

const Loading = () => {
  const { path } = useParams();
  const navigate = useNavigate();
  const [line, setLine] = useState("");

  useEffect(() => {
    if (motivationalLines.length > 0) {
      const randomIndex = Math.floor(Math.random() * motivationalLines.length);
      setLine(motivationalLines[randomIndex]);
    }
  }, []);

  useEffect(() => {
    if (path) {
      const timer = setTimeout(() => {
        navigate(`/${path}`);
      }, 2000);
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
      <p className="text-gray-700 text-lg sm:text-xl font-medium text-center max-w-md">
        {line}
      </p>
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
