import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Footer from "../../components/student/Footer";
import { AppContext } from "../../context/AppContext"; 
import { CheckCircle, XCircle, Calendar, Award, BookOpen  } from "lucide-react"; // icons

const VerifyCertificate = () => {
  const { id } = useParams();
  const { backendUrl,userData } = useContext(AppContext);
  const [certificate, setCertificate] = useState(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const { data } = await axios.get(
          `${backendUrl}/api/certificates/verify/${id}`
        );
        if (data.success) {
          setCertificate(data.certificate);
        } else {
          setCertificate(false);
          toast.error(data.message);
        }
      } catch (error) {
        toast.error(error.message);
        setCertificate(false);
      }
    };
    fetchCertificate();
  }, [id, backendUrl]);

  // ❌ Invalid certificate
  if (certificate === false) {
    return (
      <>
        <div className="min-h-screen flex flex-col justify-center items-center bg-red-50">
          <XCircle className="w-16 h-16 text-red-600 mb-4" />
          <h1 className="text-3xl font-bold text-red-600">Invalid Certificate</h1>
          <p className="mt-3 text-gray-600">
            No record found for this certificate ID.
          </p>
        </div>
        <Footer />
      </>
    );
  }

  // ⏳ Loading
  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Checking certificate validity...
      </div>
    );
  }

  // ✅ Valid certificate
  return (
    <>
      <div className="min-h-screen bg-gray-50 px-6 py-16 flex flex-col items-center">
        <div className="bg-white shadow-xl rounded-xl p-10 w-full max-w-4xl border-t-8 border-green-600">
          <div className="flex flex-col items-center text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
            <h1 className="text-3xl font-bold text-green-700">
              Certificate Valid
            </h1>
            <p className="mt-2 text-gray-600">
              This certificate has been officially issued by{" "}
              <span className="font-semibold text-gray-800 underline"><a href="https://hecademy.vercel.app/">Hecademy</a></span>.
            </p>
          </div>

          {/* Certificate Details */}
          <div className="mt-8 space-y-4 text-gray-700 text-center">
            <p className="text-lg">
              <Award className="inline-block w-5 h-5 mr-2 text-yellow-600" />
              <span className="font-medium">Issued to:</span>{" "}
              <span className="font-semibold">{certificate.userId?.name}</span>
            </p>
            <p className="text-lg">
              <BookOpen className="inline-block w-5 h-5 mr-2 text-purple-600" />
              <span className="font-medium">For completing:</span>{" "}
              {certificate.courseId?.courseTitle}
            </p>
            <p className="text-lg">
              <Calendar className="inline-block w-5 h-5 mr-2 text-red-600" />
              <span className="font-medium">Issued on:</span>{" "}
              {new Date(certificate.issueDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500">
              Certificate ID:{" "}
              <span className="font-mono">{certificate.certificateId}</span>
            </p>
          </div>

          {/* Certificate Preview */}
          {certificate.certificateUrl && (
            <div className="mt-8">
              <img
                src={certificate.certificateUrl}
                alt="Certificate"
                className="mx-auto border-2 border-gray-300 shadow-md rounded-lg w-full max-w-2xl object-contain"
              />
            </div>
          )}

          {/* LinkedIn Share */}
          {userData && (
        <div className="mt-10 text-center">
          <a
            href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME
              &name=${encodeURIComponent(certificate.courseId?.courseTitle || "Course Certificate")}
              &organizationName=${encodeURIComponent("Hecademy")}
              &issueMonth=${new Date(certificate.issueDate).getMonth() + 1}
              &issueYear=${new Date(certificate.issueDate).getFullYear()}
              &certId=${encodeURIComponent(certificate.certificateId)}
              &certUrl=${encodeURIComponent(window.location.origin + "/verify/" + certificate.certificateId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
          >
            Add to LinkedIn 
          </a>

          {/* Fallback note if LinkedIn ignores issueMonth */}
          <p className="mt-3 text-sm text-gray-500">
            If the month doesn’t updated automatically, please select{" "}
            <strong>
              {new Date(certificate.issueDate).toLocaleString("default", {
                month: "long", year:'numeric'
              })}
            </strong>{" "}
            manually when adding your certificate.
          </p>
        </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default VerifyCertificate;
