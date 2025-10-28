import axios from "axios";
import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth, useUser } from "@clerk/clerk-react";
import humanizeDuration from "humanize-duration";
import jsPDF from "jspdf";
import { assets } from '../assets/assets'

export const AppContext = createContext()

export const AppContextProvider = (props) => {

    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const pybackendUrl = import.meta.env.VITE_PYBACKEND_URL
    const currency = import.meta.env.VITE_CURRENCY

    const navigate = useNavigate()
    const { getToken } = useAuth()
    const { user } = useUser()

    const [showLogin, setShowLogin] = useState(false)
    const [recommendations, setRecommendations] = useState([]);
    const [loadingUser, setLoadingUser] = useState(true);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false); // ✅ Added missing state
    const [isEducator,setIsEducator] = useState(false)
    const [allCourses, setAllCourses] = useState([])
    const [userData, setUserData] = useState(null)
    const [enrolledCourses, setEnrolledCourses] = useState([])
    const [pendingCourses, setPendingCourses] = useState([])
    const [certificates, setCertificates] = useState([]);

    // Fetch All Courses
    const fetchAllCourses = async () => {

        try {

            const { data } = await axios.get(backendUrl + '/api/course/all');

            if (data.success) {
                setAllCourses(data.courses)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        }

    }

    // Fetch UserData 
const fetchUserData = async () => {
  try {
    const token = await getToken();

    if (!token) {
      // user is logged out
      setUserData(null);
      setIsEducator(false);
      return;
    }

    // if logged in and has educator role
    if (user?.publicMetadata?.role === 'educator') {
      setIsEducator(true);
    }

    // fetch user data with token
    const { data } = await axios.get(backendUrl + '/api/user/data', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (data.success) {
      setUserData(data.user);
    } else {
      setUserData(null); // reset if API fails
      toast.error(data.message);
    }
  } catch (error) {
    setUserData(null); // ensure cleared on error
    toast.error(error.message);
  } finally {
    setLoadingUser(false);
  }
};


    // Fetch User Enrolled Courses
    const fetchUserEnrolledCourses = async () => {

        const token = await getToken();

        const { data } = await axios.get(backendUrl + '/api/user/enrolled-courses',
            { headers: { Authorization: `Bearer ${token}` } })

        if (data.success) {
            setEnrolledCourses(data.enrolledCourses.reverse())
            setPendingCourses(data.pendingCourses || [])
            setUserData(prev => ({
          ...prev,
          pendingCourses: data.pendingCourses || []
        }))
        } else (
            toast.error(data.message)
        )

    }

    // Function to Calculate Course Chapter Time
    const calculateChapterTime = (chapter) => {

        let time = 0

        chapter.chapterContent.map((lecture) => time += lecture.lectureDuration)

        return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] })

    }

    // Function to Calculate Course Duration
    const calculateCourseDuration = (course) => {

        let time = 0

        course.courseContent.map(
            (chapter) => chapter.chapterContent.map(
                (lecture) => time += lecture.lectureDuration
            )
        )

        return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] })

    }

    const calculateRating = (course) => {

        if (course.courseRatings.length === 0) {
            return 0
        }

        let totalRating = 0
        course.courseRatings.forEach(rating => {
            totalRating += rating.rating
        })
        return Math.floor(totalRating / course.courseRatings.length)
    }

    const calculateNoOfLectures = (course) => {
        let totalLectures = 0;
        course.courseContent.forEach(chapter => {
            if (Array.isArray(chapter.chapterContent)) {
                totalLectures += chapter.chapterContent.length;
            }
        });
        return totalLectures;
    }


    useEffect(() => {
        fetchAllCourses()
    }, [])

    // Fetch User's Data if User is Logged In
    useEffect(() => {
        if (user) {
            fetchUserData()
            fetchUserEnrolledCourses()
            fetchCertificates();
        }else {
    setUserData(null);
    setLoadingUser(false); 
        }
    }, [user])
    useEffect(() => {
  if (userData && !isEducator) {
    fetchRecommendations();
  }
}, [userData, isEducator]);


const fetchRecommendations = async () => {
  try {
    setLoadingRecommendations(true);
    const token = await getToken();
    if (!token) return;

    const { data } = await axios.post(
      backendUrl + "/api/recommendations/user",
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (data.success && data.recommended?.length > 0) {
      setRecommendations(data.recommended);
    } else {
      setRecommendations([]);
    }
  } catch (error) {
    toast.error("Recommendation error: " + error.message);
  } finally {
    setLoadingRecommendations(false);
  }
};

const fetchCertificates = async () => {
  try {
    const token = await getToken();
    const { data } = await axios.get(
      backendUrl + "/api/certificates/my-certificates",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (data.success) {
      setCertificates(data.certificates);
    }
  } catch (error) {
    toast.error(error.message);
  }
};

// ✅ Update user progress (send lecture duration too)
const updateUserCourseProgress = async (courseId, lectureId, duration) => {
  try {
    const token = await getToken();
    if (!token) return;

    const { data } = await axios.post(
      backendUrl + "/api/user/update-course-progress",
      {
        courseId,
        lectureId,
        duration: duration || 0, // lectureDuration in minutes
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (data.success) {
      console.log("✅ Progress updated:", data.message);
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error(error.message);
  }
};



const generateCertificateForCourse = async (course, user) => {
  try {
    if (!course || !user) return;

    const token = await getToken();
    if (!token) return;

    const userName = user.name || "Student";
    const courseName = course.courseTitle || "Unnamed Course";
    const issueDate = new Date().toLocaleDateString();

    // Step 1: Create base doc
    const doc = new jsPDF("landscape", "pt", "a4");
    doc.addImage(assets.certificateTemplate, "PNG", 0, 0, 842, 595);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text(userName, 478, 265, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(courseName, 475, 355, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(14);
    doc.text(issueDate, 270, 47, { align: "center" });

    // Step 2: Convert to PNG for backend upload
    const imgData = doc.output("datauristring");
    const pngBlob = await (await fetch(imgData)).blob();
    const pngFile = new File([pngBlob], "certificate.png", { type: "image/png" });

    const formData = new FormData();
    formData.append("courseId", course._id);
    formData.append("certificateFile", pngFile);

    // Step 3: Upload to backend → Cloudinary
    const { data } = await axios.post(backendUrl + "/api/certificates/issue", formData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (data.success) {
      toast.success("Certificate issued!");
      fetchCertificates();
      return data.certificate;
    } else {
      toast.error(data.message);
    }
  } catch (err) {
    toast.error("Certificate generation failed: " + err.message);
  }
};

const fetchLeaderboard = async () => {
  try {
    const token = await getToken();
    const { data } = await axios.get(`${backendUrl}/api/user/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.leaderboard || [];
  } catch (error) {
    toast.error(error.message);
    return [];
  }
};



    const value = {
        showLogin, setShowLogin,
        backendUrl, currency, navigate,
        userData, setUserData, getToken,
        allCourses, fetchAllCourses,pendingCourses,
        enrolledCourses, fetchUserEnrolledCourses,
        calculateChapterTime, calculateCourseDuration,
        calculateRating, calculateNoOfLectures,
        isEducator,setIsEducator, recommendations, 
        fetchRecommendations ,certificates, fetchCertificates, 
        generateCertificateForCourse, loadingUser, updateUserCourseProgress, fetchLeaderboard,loadingRecommendations,
    }


    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )

}
