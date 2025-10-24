import React, { useEffect, useState } from "react";
import Footer from "../../components/student/Footer";
import Loading from "../../components/student/Loading";

const About = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loading />;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-cyan-100/70 py-10 px-6 md:px-36 leading-relaxed text-gray-700 ">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">About Hecademy</h1>

        <p className="mb-6">
          Hecademy was founded with a single vision — to make learning accessible, personalized, and meaningful for everyone. In a world where education is rapidly evolving, we believe that technology can bridge the gap between curiosity and capability. Our mission is not just to deliver courses but to build lifelong learners who are curious, adaptable, and inspired to achieve more.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">Our Story</h2>
        <p className="mb-6">
          Hecademy began as a small idea between a group of passionate learners and educators who wanted to revolutionize the way students engage with online education. We noticed that most online learning platforms focused solely on delivering video content but lacked engagement, personalization, and practical interaction. Students often completed courses but struggled to apply what they learned. That insight became our starting point.
        </p>
        <p className="mb-6">
          Over countless nights of brainstorming, designing, and building, we created Hecademy — a smart, intuitive, and inclusive learning platform that goes beyond traditional e-learning. From beginner-friendly coding tutorials to advanced technical concepts, from communication skills to real-world problem solving, we cover every dimension of learning that helps students grow both personally and professionally.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">Our Philosophy</h2>
        <p className="mb-6">
          We believe that every learner is unique. Each individual learns at their own pace, has different strengths, and follows a distinct path of curiosity. That’s why Hecademy is designed to adapt to the learner. Our recommendation system, skill-based quizzes, and real-time dashboards ensure that every student’s journey feels truly personal. We don’t just measure progress through numbers — we measure growth through confidence, skill improvement, and creativity.
        </p>
        <p className="mb-6">
          In Hecademy, education isn’t confined to a classroom or limited by schedules. We empower students to learn anywhere, anytime — whether it’s mastering a new programming language during a bus ride or revisiting a lecture before an exam. Our technology adapts to you, so you can focus on what truly matters — learning.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">Our Values</h2>
        <ul className="list-disc pl-8 mb-6 space-y-2">
          <li><strong>Empathy:</strong> We understand the learner’s journey and create tools that make education inclusive and stress-free.</li>
          <li><strong>Innovation:</strong> We constantly explore emerging technologies like AI, data visualization, and gamification to make learning dynamic.</li>
          <li><strong>Integrity:</strong> We believe in ethical education and transparent learning outcomes.</li>
          <li><strong>Community:</strong> We’re not just a platform; we’re a community of learners and mentors who help each other grow.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">The Hecademy Experience</h2>
        <p className="mb-6">
          Every feature in Hecademy was crafted with purpose. The interactive dashboards help track performance effortlessly. The leaderboard encourages healthy competition, and the built-in code editor enables students to practice what they learn instantly. Our integrated quizzes and AI-driven feedback ensure that you not only complete a course but also truly understand it.
        </p>
        <p className="mb-6">
          Beyond individual learning, Hecademy connects educators with students across the globe. Teachers can easily manage courses, analyze student engagement, and offer personalized feedback — all within one platform. It’s education reimagined for the 21st century.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">Our Team</h2>
        <p className="mb-6">
          The Hecademy team is a blend of passionate developers, creative designers, data scientists, and educators. We come from diverse backgrounds but share one purpose: to redefine education through technology. Every update, every new feature, every innovation we release is guided by one question — “How can this help our learners succeed?”
        </p>
        <p className="mb-6">
          Our founders — <strong>Jaianandakrishnaa K</strong>, <strong>Shigivahan A</strong>, and <strong>Charan Vivek Raj R</strong> — envisioned a world where technology amplifies human potential instead of replacing it. They built Hecademy with empathy, engineering excellence, and creativity at its core.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">The Future of Learning</h2>
        <p className="mb-6">
          As we move forward, Hecademy aims to integrate even deeper with the global learning ecosystem. Our roadmap includes features like AI-driven mentorship, adaptive difficulty systems, peer learning networks, and verified certification frameworks. We also plan to expand to more subjects, languages, and specialized learning paths for professionals.
        </p>
        <p className="mb-6">
          The future of learning isn’t about memorizing — it’s about mastering. It’s not about scoring — it’s about understanding. It’s not about racing others — it’s about improving yourself. At Hecademy, that’s what we stand for.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">Join the Revolution</h2>
        <p className="mb-6">
          Whether you’re a student, educator, or lifelong learner — welcome to Hecademy. Let’s build the future of learning together. Because education should never be one-size-fits-all. It should be yours.
        </p>
      </div>
      <Footer />
    </>
  );
};

export default About;
