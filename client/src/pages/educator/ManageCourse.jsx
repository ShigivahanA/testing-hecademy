import React, { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { Edit3, Eye, EyeOff, Loader2, X } from "lucide-react";
import { assets } from "../../assets/assets";
import Quill from "quill";
import uniqid from "uniqid";

const ManageCourse = () => {
  const { backendUrl, getToken } = useContext(AppContext);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [editingLecture, setEditingLecture] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // --- Responsive sidebar hide on edit ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      const sidebar = document.querySelector(".educator-sidebar");
      if (sidebar) sidebar.style.display = selectedCourse ? "none" : "block";
    }
  }, [selectedCourse, isMobile]);

  // --- Lecture update logic ---
  const handleLectureUpdate = () => {
    if (!editingLecture) return;

    const { chapterId, lecture } = editingLecture;
    const updated = selectedCourse.courseContent.map((ch) => {
      if (ch.chapterId === chapterId) {
        ch.chapterContent = ch.chapterContent.map((lec) =>
          lec.lectureId === lecture.lectureId ? lecture : lec
        );
      }
      return ch;
    });

    setSelectedCourse({ ...selectedCourse, courseContent: updated });
    setEditingLecture(null);
    toast.success("Lecture updated");
  };

  // --- Fetch educator courses ---
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/educator/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      data.success ? setCourses(data.courses) : toast.error(data.message);
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // --- Publish toggle ---
  const toggleVisibility = async (id) => {
    try {
      const token = await getToken();
      const { data } = await axios.patch(
        `${backendUrl}/api/educator/toggle-visibility/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message);
        setCourses((prev) =>
          prev.map((c) =>
            c._id === id ? { ...c, isPublished: data.isPublished } : c
          )
        );
      } else toast.error(data.message);
    } catch {
      toast.error("Failed to change visibility");
    }
  };

  // --- Initialize Quill ---
  useEffect(() => {
    if (selectedCourse && editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, { theme: "snow" });
      quillRef.current.root.innerHTML = selectedCourse.courseDescription || "";
    }
  }, [selectedCourse]);

  // --- Add/Remove chapter or lecture ---
  const handleChapter = (action, chapterId) => {
    if (action === "add") {
      const title = prompt("Enter Chapter Title:");
      if (!title) return;
      const newChap = {
        chapterId: uniqid(),
        chapterTitle: title,
        chapterOrder: selectedCourse.courseContent.length + 1,
        chapterContent: [],
      };
      setSelectedCourse({
        ...selectedCourse,
        courseContent: [...selectedCourse.courseContent, newChap],
      });
    } else if (action === "remove") {
      setSelectedCourse({
        ...selectedCourse,
        courseContent: selectedCourse.courseContent.filter(
          (ch) => ch.chapterId !== chapterId
        ),
      });
    }
  };

  const handleLecture = (chapterId, action, lectureIndex) => {
    const updated = selectedCourse.courseContent.map((ch) => {
      if (ch.chapterId === chapterId) {
        if (action === "add") {
          const title = prompt("Lecture Title:");
          const url = prompt("Lecture URL:");
          const duration = prompt("Duration (mins):");
          ch.chapterContent.push({
            lectureId: uniqid(),
            lectureTitle: title,
            lectureUrl: url,
            lectureDuration: Number(duration) || 0,
            isPreviewFree: false,
            lectureOrder: ch.chapterContent.length + 1,
          });
        } else if (action === "remove") {
          ch.chapterContent.splice(lectureIndex, 1);
        }
      }
      return ch;
    });
    setSelectedCourse({ ...selectedCourse, courseContent: updated });
  };

  // --- Save whole course ---
  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await getToken();

      const updatedData = {
        ...selectedCourse,
        courseDescription: quillRef.current.root.innerHTML,
      };

      const formData = new FormData();
      formData.append("courseData", JSON.stringify(updatedData));
      if (imageFile) formData.append("image", imageFile);

      const { data } = await axios.put(
        `${backendUrl}/api/educator/update-course/${selectedCourse._id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success("Course updated successfully!");
        setSelectedCourse(null);
        quillRef.current = null;
        setImageFile(null);
        fetchCourses();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-[60vh] text-gray-600">
        <Loader2 className="animate-spin mr-2" /> Loading courses...
      </div>
    );

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-gray-50 min-h-screen">
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6 text-center md:text-left">
        Manage Courses
      </h1>

      {/* ---- Course List ---- */}
      {!selectedCourse ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course._id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <img
                  src={course.courseThumbnail}
                  alt={course.courseTitle}
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />
                <h2 className="font-semibold text-gray-800 truncate">
                  {course.courseTitle}
                </h2>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                  {course.courseDescription.replace(/<[^>]+>/g, "")}
                </p>
                <p className="text-sm mt-2">
                  ₹{course.coursePrice} | {course.discount}% off
                </p>
                <p className="text-sm mt-1">
                  <b>Status:</b>{" "}
                  <span
                    className={`${
                      course.isPublished ? "text-green-600" : "text-red-500"
                    } font-medium`}
                  >
                    {course.isPublished ? "Published" : "Hidden"}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-between items-center mt-4">
                <button
                  onClick={() => setSelectedCourse(course)}
                  className="flex items-center gap-1 text-sm bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 w-full sm:w-auto justify-center"
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  onClick={() => toggleVisibility(course._id)}
                  className="flex items-center gap-1 text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 w-full sm:w-auto justify-center"
                >
                  {course.isPublished ? (
                    <>
                      <EyeOff size={14} /> Hide
                    </>
                  ) : (
                    <>
                      <Eye size={14} /> Publish
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // ---- Edit Course View ----
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md relative max-w-4xl mx-auto w-full overflow-y-auto">
          <button
            onClick={() => {
              setSelectedCourse(null);
              quillRef.current = null;
            }}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            <X size={22} />
          </button>

          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800 text-center sm:text-left">
            Edit Course – {selectedCourse.courseTitle}
          </h2>

          {/* Course Fields */}
          <div className="flex flex-col gap-3">
            <label className="text-sm text-gray-700">Title</label>
            <input
              type="text"
              value={selectedCourse.courseTitle}
              onChange={(e) =>
                setSelectedCourse({
                  ...selectedCourse,
                  courseTitle: e.target.value,
                })
              }
              className="w-full border rounded px-3 py-2"
            />

            <label className="text-sm text-gray-700">Description</label>
            <div ref={editorRef} className="mb-4 border rounded min-h-[150px]" />

            <label className="text-sm text-gray-700">Tags (comma separated)</label>
            <input
              type="text"
              value={selectedCourse.tags?.join(",") || ""}
              onChange={(e) =>
                setSelectedCourse({
                  ...selectedCourse,
                  tags: e.target.value.split(",").map((t) => t.trim()),
                })
              }
              className="w-full border rounded px-3 py-2"
            />

            <label className="text-sm text-gray-700">Difficulty</label>
            <select
              value={selectedCourse.difficulty}
              onChange={(e) =>
                setSelectedCourse({
                  ...selectedCourse,
                  difficulty: e.target.value,
                })
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <label className="text-sm text-gray-700">Thumbnail</label>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
              <img
                src={
                  imageFile
                    ? URL.createObjectURL(imageFile)
                    : selectedCourse.courseThumbnail
                }
                alt="thumbnail"
                className="w-28 h-28 object-cover rounded border"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="text-sm"
              />
            </div>
          </div>

          {/* Chapters */}
          <h3 className="text-base font-semibold mb-2 mt-4 text-gray-800">
            Chapters
          </h3>

          {selectedCourse.courseContent?.map((ch) => (
            <div
  key={ch.chapterId}
  className="border rounded p-3 mb-3 bg-gray-50"
>
  <div className="flex sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 w-full">
    <p className="font-semibold text-gray-800">{ch.chapterTitle}</p>
    <div className="flex justify-end sm:justify-start w-full sm:w-auto">
      <button
        onClick={() => handleChapter("remove", ch.chapterId)}
        className="text-red-500 text-sm hover:text-red-600"
      >
        Remove
      </button>
    </div>
  </div>
              {ch.chapterContent?.length > 0 ? (
                ch.chapterContent.map((lec, i) => (
                  <div
                    key={lec.lectureId}
                    className="text-sm flex flex-col sm:flex-row justify-between sm:items-center border-t pt-2 mt-2 gap-1"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {i + 1}. {lec.lectureTitle}
                      </p>
                      <p className="text-gray-500 text-xs break-all">
                        {lec.lectureDuration} mins •{" "}
                        <a
                          href={lec.lectureUrl}
                          target="_blank"
                          className="text-blue-600 underline"
                        >
                          Open
                        </a>{" "}
                        • {lec.isPreviewFree ? "Free" : "Paid"}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-1 sm:mt-0">
                      <button
                        onClick={() =>
                          setEditingLecture({
                            chapterId: ch.chapterId,
                            lecture: lec,
                          })
                        }
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleLecture(ch.chapterId, "remove", i)}
                        className="text-red-500 text-xs hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm mt-2 italic">
                  No lectures yet
                </p>
              )}

              <button
                onClick={() => handleLecture(ch.chapterId, "add")}
                className="mt-2 text-blue-600 text-sm hover:underline"
              >
                + Add Lecture
              </button>
            </div>
          ))}

          <button
            onClick={() => handleChapter("add")}
            className="bg-blue-100 px-4 py-1 rounded text-sm text-blue-700 mt-2"
          >
            + Add Chapter
          </button>

          {/* --- Save / Cancel Buttons --- */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setSelectedCourse(null);
                quillRef.current = null;
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full sm:w-auto"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin w-4 h-4" /> Saving...
                </span>
              ) : (
                "Save Course"
              )}
            </button>
          </div>

          {/* --- Edit Lecture Popup --- */}
          {editingLecture && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
              <div className="bg-white rounded-lg p-5 w-full max-w-sm sm:max-w-md shadow-lg relative">
                <h2 className="text-lg font-semibold text-gray-800 mb-3 text-center">
                  Edit Lecture
                </h2>

                <label className="text-sm text-gray-700">Title</label>
                <input
                  type="text"
                  value={editingLecture.lecture.lectureTitle}
                  onChange={(e) =>
                    setEditingLecture({
                      ...editingLecture,
                      lecture: {
                        ...editingLecture.lecture,
                        lectureTitle: e.target.value,
                      },
                    })
                  }
                  className="w-full border rounded px-3 py-2 mb-2"
                />

                <label className="text-sm text-gray-700">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={editingLecture.lecture.lectureDuration}
                  onChange={(e) =>
                    setEditingLecture({
                      ...editingLecture,
                      lecture: {
                        ...editingLecture.lecture,
                        lectureDuration: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full border rounded px-3 py-2 mb-2"
                />

                <label className="text-sm text-gray-700">Lecture URL</label>
                <input
                  type="text"
                  value={editingLecture.lecture.lectureUrl}
                  onChange={(e) =>
                    setEditingLecture({
                      ...editingLecture,
                      lecture: {
                        ...editingLecture.lecture,
                        lectureUrl: e.target.value,
                      },
                    })
                  }
                  className="w-full border rounded px-3 py-2 mb-2 break-all"
                />

                <div className="flex items-center gap-2 mt-2 mb-4">
                  <input
                    type="checkbox"
                    checked={editingLecture.lecture.isPreviewFree}
                    onChange={(e) =>
                      setEditingLecture({
                        ...editingLecture,
                        lecture: {
                                                      ...editingLecture.lecture,
                          isPreviewFree: e.target.checked,
                        },
                      })
                    }
                    className="scale-125"
                  />
                  <label className="text-sm text-gray-700">Free Preview</label>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingLecture(null)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLectureUpdate}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 w-full sm:w-auto"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageCourse;
