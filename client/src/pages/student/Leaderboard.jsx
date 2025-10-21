import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";
import Footer from "../../components/student/Footer";

const Leaderboard = () => {
  const { backendUrl, getToken } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);

  const fetchLeaderboard = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/user/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setLeaderboard(data.leaderboard);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  if (loading) return <Loading />;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-10 px-6 lg:px-36">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-10 space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🏆 Leaderboard
            </h1>
            <p className="text-gray-500">
              See who’s leading the learning journey this week!
            </p>
          </div>

          {/* Table / Cards */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-3 text-gray-600 font-semibold">Rank</th>
                  <th className="p-3 text-gray-600 font-semibold">Learner</th>
                  <th className="p-3 text-gray-600 font-semibold text-right">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((user, index) => (
                  <tr
                    key={user._id}
                    className={`border-b hover:bg-gray-50 transition ${
                      index === 0
                        ? "bg-yellow-50"
                        : index === 1
                        ? "bg-gray-50"
                        : index === 2
                        ? "bg-orange-50"
                        : ""
                    }`}
                  >
                    <td className="p-3 text-gray-700 font-medium">
                      {index + 1}
                    </td>
                    <td className="p-3 flex items-center gap-3">
                      <img
                        src={user.imageUrl}
                        alt={user.name}
                        className="w-10 h-10 rounded-full border"
                      />
                      <div>
                        <p className="text-gray-800 font-medium">{user.name}</p>
                        {index === 0 && (
                          <p className="text-yellow-600 text-xs font-semibold">
                            🥇 Top Learner
                          </p>
                        )}
                        {index === 1 && (
                          <p className="text-gray-500 text-xs font-semibold">
                            🥈 Second Place
                          </p>
                        )}
                        {index === 2 && (
                          <p className="text-orange-500 text-xs font-semibold">
                            🥉 Third Place
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold text-gray-800">
                      {user.totalScore || 0} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-8">
            <a
              href="/dashboard"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Leaderboard;
