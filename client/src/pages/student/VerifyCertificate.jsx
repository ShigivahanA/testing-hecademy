import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";

const VerifyCertificate = () => {
  const { id } = useParams();
  const { backendUrl } = useContext(AppContext);  // ✅ get from context
  const [certificate, setCertificate] = useState(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/certificates/verify/${id}`);
        if (data.success) {
          setCertificate(data.certificate);
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        toast.error(error.message);
      }
    };
    fetchCertificate();
  }, [id, backendUrl]);

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
    </div>
  );
};

export default VerifyCertificate;
