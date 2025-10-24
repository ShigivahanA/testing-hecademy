import React, { useContext, useEffect, useState, useRef } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";
import Footer from "../../components/student/Footer";

const Leaderboard = () => {
  const { backendUrl, getToken, userData, isEducator } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const intervalRef = useRef(null);

  // 🚫 Blocklist of users
  const blockedUsers = [
    "user_32g4gPbfjrB9tHbEPwqUXnh0wel",
    "user_335XtmAQo0FtLNgyIJDK01Wrf4f",
  ];

  // ✅ Fetch Leaderboard
  const fetchLeaderboard = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/user/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        const filtered = (data.leaderboard || []).filter(
          (user) => !blockedUsers.includes(user._id)
        );

        // ✅ Update only if data actually changed (avoid flicker)
        const hasChanged =
          JSON.stringify(filtered) !== JSON.stringify(leaderboard);
        if (hasChanged) setLeaderboard(filtered);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Leaderboard fetch failed:", error);
      // Don’t show toast repeatedly on background fetches
      if (leaderboard.length === 0) toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Effect – initial fetch + silent refresh every 3s
  useEffect(() => {
    if (!isEducator) {
      fetchLeaderboard();

      // 🔁 Silent background refresh every 3 seconds
      intervalRef.current = setInterval(fetchLeaderboard, 3000);

      return () => clearInterval(intervalRef.current);
    } else {
      setLoading(false);
    }
  }, [isEducator]);

  if (loading) return <Loading />;

  // 🔒 Restrict educators
  if (isEducator) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 px-4">
        <div className="max-w-md text-center bg-white/70 backdrop-blur-lg shadow-xl rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-3 text-gray-800">
            Access Restricted 🚫
          </h1>
          <p className="text-gray-600 mb-6">
            The leaderboard is only available for learners.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-medium transition-all duration-300 hover:bg-blue-700 hover:-translate-x-1 hover:shadow-lg"
          >
            Back to Dashboard
          </a>
        </div>
        <Footer />
      </div>
    );
  }

  // 🏆 Leaderboard Display
  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-cyan-100/70 py-12 sm:py-16 px-5 sm:px-10 lg:px-32 transition-all">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 mb-2 tracking-tight">
            Weekly Leaderboard
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            The top learners of the week are showcased here. Keep learning to
            climb the ranks!
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white shadow-md rounded-xl border border-gray-100 mt-6 sm:mt-10 mb-12 sm:mb-16">
          <table className="w-full border-collapse text-left rounded-lg overflow-hidden text-sm sm:text-base">
            <thead>
              <tr className="bg-gradient-to-r from-cyan-100 to-blue-100 text-gray-700 border-b border-gray-300">
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-[12px] sm:text-sm font-semibold uppercase tracking-wide">
                  Rank
                </th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-[12px] sm:text-sm font-semibold uppercase tracking-wide">
                  Learner
                </th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-[12px] sm:text-sm font-semibold text-right uppercase tracking-wide">
                  Score
                </th>
              </tr>
            </thead>

            <tbody>
              {leaderboard.map((user, index) => {
                const isCurrentUser = user._id === userData?._id;

                const rowStyles =
                  index === 0
                    ? "bg-gradient-to-r from-yellow-100 via-yellow-50 to-white"
                    : index === 1
                    ? "bg-gradient-to-r from-gray-100 via-gray-50 to-white"
                    : index === 2
                    ? "bg-gradient-to-r from-orange-100 via-orange-50 to-white"
                    : "bg-white";

                return (
                  <tr
                    key={user._id}
                    className={`border-b border-gray-200 hover:bg-cyan-50 transition-all duration-300 ${rowStyles}`}
                  >
                    <td className="px-4 py-3 sm:px-6 sm:py-4 text-gray-700 font-semibold text-xs sm:text-sm">
                      #{index + 1}
                    </td>

                    <td className="px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={user.imageUrl || "/default-avatar.png"}
                          alt={user.name}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 shadow-sm ${
                            isCurrentUser
                              ? "border-cyan-400"
                              : "border-gray-200"
                          }`}
                        />
                        {isCurrentUser && (
                          <span className="absolute inset-0 rounded-full ring-2 ring-cyan-400 animate-pulse opacity-40"></span>
                        )}
                      </div>

                      <div>
                        <p className="text-gray-800 font-medium text-sm sm:text-base leading-tight flex items-center gap-1">
                          {user.name}
                          {isCurrentUser && (
                            <span className="ml-1 text-cyan-500 text-[11px] sm:text-xs font-semibold">
                              (You)
                            </span>
                          )}
                        </p>

                        {index === 0 && (
                          <span className="text-yellow-600 text-[10px] sm:text-xs font-semibold">
                            🥇 Top Learner
                          </span>
                        )}
                        {index === 1 && (
                          <span className="text-gray-500 text-[10px] sm:text-xs font-semibold">
                            🥈 Second Place
                          </span>
                        )}
                        {index === 2 && (
                          <span className="text-orange-500 text-[10px] sm:text-xs font-semibold">
                            🥉 Third Place
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 sm:px-6 sm:py-4 text-right text-gray-800 font-semibold text-xs sm:text-sm">
                      {user.totalScore || 0} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Current User Highlight */}
        {userData && (
          <div className="text-center mt-10 sm:mt-14">
            <p className="text-sm text-gray-600">
              Your current position:{" "}
              <span className="font-semibold text-cyan-600">
                #
                {leaderboard.findIndex((u) => u._id === userData._id) + 1 ||
                  "N/A"}
              </span>
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-12 sm:mt-16 mb-10 sm:mb-16">
          <a
            href="/dashboard"
            className="inline-block px-6 py-2 bg-cyan-500 text-white rounded-full text-sm font-medium transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-lg"
          >
            Back to Dashboard
          </a>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Leaderboard;
