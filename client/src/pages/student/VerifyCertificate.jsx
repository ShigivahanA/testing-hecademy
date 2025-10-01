import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";

const VerifyCertificate = () => {
  const { id } = useParams();
  const { backendUrl } = useContext(AppContext);
  const [certificate, setCertificate] = useState(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/certificates/verify/${id}`);
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

  // Invalid certificate UI
  if (certificate === false) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-3xl font-bold text-red-600">❌ Invalid Certificate</h1>
        <p className="mt-4 text-gray-500">No record found for this certificate.</p>
      </div>
    );
  }

  // Loading UI
  if (!certificate) {
    return <p className="text-center mt-20">Checking certificate validity...</p>;
  }

  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold text-green-600">✅ Valid Certificate</h1>
      <p className="mt-4 text-xl">
        Issued to <span className="font-semibold">{certificate.userId?.name}</span>
      </p>
      <p className="mt-2">For completing: {certificate.courseId?.courseTitle}</p>
      <p className="mt-2 text-gray-500">
        Issued on: {new Date(certificate.issueDate).toLocaleDateString()}
      </p>

      {/* Certificate Preview */}
      {certificate.certificateUrl && (
        <div className="mt-6">
          <img
            src={certificate.certificateUrl}
            alt="Certificate"
            className="mx-auto border shadow-lg rounded-lg w-full max-w-2xl object-contain"
          />
        </div>
      )}

      {/* LinkedIn Share */}
      <div className="mt-6">
<a
  href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME
    &name=${encodeURIComponent(certificate.courseId?.courseTitle || "Course Certificate")}
    &organizationName=${encodeURIComponent("Hecademy")}
    &issueYear=${new Date(certificate.issueDate).getFullYear()}
    &issueMonth=${new Date(certificate.issueDate).getMonth() + 1}
    &credentialID=${encodeURIComponent(certificate.certificateId)}
    &credentialURL=${encodeURIComponent(window.location.origin + "/verify/" + certificate.certificateId)}
  `}
  target="_blank"
  rel="noopener noreferrer"
  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
>
  📜 Add to LinkedIn Profile
</a>

</div>

    </div>
  );
};

export default VerifyCertificate;
