import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";
import Footer from "../../components/student/Footer";

const Leaderboard = () => {
  const { backendUrl, getToken, userData, isEducator } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);

  // 🚫 Blocklist of users
  const blockedUsers = [
    "user_32g4gPbfjrB9tHbEPwqUXnh0wel",
    "user_335XtmAQo0FtLNgyIJDK01Wrf4f",
  ];

  const fetchLeaderboard = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/user/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        // ✅ Filter out blocked users right here
        const filtered = (data.leaderboard || []).filter(
          (user) => !blockedUsers.includes(user._id)
        );
        setLeaderboard(filtered);
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
    if (!isEducator) {
      fetchLeaderboard();
    } else {
      setLoading(false);
    }
  }, [isEducator]);

  if (loading) return <Loading />;

  // 🔒 Restrict educators from seeing this page
  if (isEducator) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 text-gray-600 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-3 text-gray-800">
            Access Restricted
          </h1>
          <p className="text-gray-500 mb-6">
            The leaderboard is available only for learners.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </a>
        </div>
        <Footer />
      </div>
    );
  }

  // 🏆 Leaderboard Display for Learners
  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-3 sm:px-6 lg:px-36">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              🏆 Leaderboard
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">
              See who’s leading the learning journey this week!
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-2 sm:p-3 text-[12px] sm:text-sm text-gray-600 font-semibold">
                    Rank
                  </th>
                  <th className="p-2 sm:p-3 text-[12px] sm:text-sm text-gray-600 font-semibold">
                    Learner
                  </th>
                  <th className="p-2 sm:p-3 text-[12px] sm:text-sm text-gray-600 font-semibold text-right">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((user, index) => {
                  const isCurrentUser = user._id === userData?._id;

                  const baseColor =
                    index === 0
                      ? "bg-yellow-50"
                      : index === 1
                      ? "bg-gray-50"
                      : index === 2
                      ? "bg-orange-50"
                      : isCurrentUser
                      ? "bg-blue-50"
                      : "";

                  const glow =
                    isCurrentUser && index > 2
                      ? "shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                      : "";

                  return (
                    <tr
                      key={user._id}
                      className={`border-b hover:bg-cyan-50 transition ${baseColor} ${glow}`}
                    >
                      <td className="p-2 sm:p-3 text-gray-700 font-medium text-xs sm:text-sm">
                        {index + 1}
                      </td>

                      <td className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                        <img
                          src={user.imageUrl}
                          alt={user.name}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border"
                        />
                        <div>
                          <p className="text-gray-800 font-medium text-sm sm:text-base leading-tight">
                            {user.name}
                            {isCurrentUser && (
                              <span className="ml-2 text-cyan-500 text-[11px] sm:text-xs font-semibold">
                                (You)
                              </span>
                            )}
                          </p>
                          {index === 0 && (
                            <p className="text-yellow-600 text-[10px] sm:text-xs font-semibold">
                              🥇 Top Learner
                            </p>
                          )}
                          {index === 1 && (
                            <p className="text-gray-500 text-[10px] sm:text-xs font-semibold">
                              🥈 Second Place
                            </p>
                          )}
                          {index === 2 && (
                            <p className="text-orange-500 text-[10px] sm:text-xs font-semibold">
                              🥉 Third Place
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="p-2 sm:p-3 text-right font-semibold text-gray-800 text-xs sm:text-sm">
                        {user.totalScore || 0} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-6 sm:mt-8">
            <a
              href="/dashboard"
              className="inline-block px-5 py-2 sm:px-6 sm:py-2 bg-cyan-100 text-black rounded-lg text-xs sm:text-sm font-medium hover:-translate-x-1 duration-500 hover:shadow-[4px_4px_0_#000]"
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
