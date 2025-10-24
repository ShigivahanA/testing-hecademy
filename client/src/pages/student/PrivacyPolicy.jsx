import React, { useEffect, useState } from "react";
import Footer from "../../components/student/Footer";
import Loading from "../../components/student/Loading";

const PrivacyPolicy = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loading />;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-gray-50 py-10 px-6 md:px-36">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Privacy Policy</h1>
        <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
          At Hecademy, your privacy is our top priority. We use your information 
          responsibly to improve your learning experience. We never sell or share 
          your personal data without consent. By using our platform, you agree to 
          our data protection and privacy principles.
        </p>
        <p className="text-gray-600 text-sm sm:text-base mt-4">
          For inquiries, contact us at{" "}
          <span className="text-blue-500">support@hecademy.com</span>.
        </p>
      </div>
      <Footer />
    </>
  );
};

export default PrivacyPolicy;
