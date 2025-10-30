import React, { useEffect, useState } from "react";
import Footer from "../../components/student/Footer";
import Loading from "../../components/student/Loading";
import axios from "axios";
import { toast } from "react-toastify";

const Contact = () => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loading />;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/contact`,
        formData
      );

      if (data.success) {
        toast.success("Message sent successfully!");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else toast.error(data.message);
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-cyan-100/70 via-white to-white py-10 px-6 md:px-36 text-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Contact Us
        </h1>

        {/* Description */}
        <p className="text-justify max-w-3xl mx-auto text-sm sm:text-base mb-12 leading-relaxed">
          Have questions, suggestions, or feedback? We’d love to hear from you.
          Whether you’re a student, educator, or institution — the Hecademy team
          is here to help you. Fill out the form below or reach us directly via
          our office contacts.
        </p>

        {/* Contact Form */}
        <div className="max-w-3xl mx-auto bg-gradient-to-b from-cyan-100/70 via-white to-white rounded-3xl shadow-lg border border-gray-100 p-8 sm:p-10 mb-20">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 text-center">
            Send us a Message
          </h2>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-2">
                Full Name
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                type="text"
                required
                placeholder="Your full name"
                className="px-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-2">
                Email Address
              </label>
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
                required
                placeholder="your@email.com"
                className="px-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex flex-col sm:col-span-2">
              <label className="text-sm font-medium text-gray-600 mb-2">
                Subject
              </label>
              <input
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                type="text"
                required
                placeholder="Subject of your message"
                className="px-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex flex-col sm:col-span-2">
              <label className="text-sm font-medium text-gray-600 mb-2">
                Message
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={6}
                required
                placeholder="Type your message here..."
                className="px-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all resize-none"
              ></textarea>
            </div>

            <div className="sm:col-span-2 flex justify-center mt-4">
              <button
                type="submit"
                disabled={sending}
                className={`px-8 py-3 rounded-lg text-white font-medium shadow-md transition-all duration-300 ${
                  sending
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-cyan-500 hover:bg-cyan-600 hover:-translate-y-0.5"
                }`}
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
            </div>
          </form>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "How can I enroll in a course?",
                a: "Simply visit our course list page, choose a course you like, and click 'Enroll'. Once enrolled, it will appear in your dashboard.",
              },
              {
                q: "Can I access my courses on mobile?",
                a: "Yes! Hecademy is fully responsive and works perfectly across all devices — laptops, tablets, and smartphones.",
              },
              {
                q: "Are there certificates available?",
                a: "Absolutely. Once you complete a course, you’ll receive a verifiable digital certificate directly in your profile.",
              },
              {
                q: "I forgot my login credentials. What should I do?",
                a: "Use the 'Forgot password' option on the login page or contact our support team using this form for quick assistance.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all"
              >
                <p className="font-semibold text-gray-800">{faq.q}</p>
                <p className="text-sm text-gray-600 mt-2">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Office Info */}
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Our Office
          </h2>
          <div className="text-center text-sm sm:text-base">
            <div>
              <p>Hecademy Technologies Pvt. Ltd.</p>
              <p>123 Innovation Street, Bengaluru, India</p>
              <p>☎ +91 9344718155</p>
              <p>📧 support@hecademy.com</p>
            </div>
          </div>
        </div>

      <Footer />
    </>
  );
};

export default Contact;
