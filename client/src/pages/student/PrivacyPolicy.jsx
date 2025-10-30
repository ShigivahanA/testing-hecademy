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
      <div className="min-h-screen bg-gradient-to-b from-cyan-100/70 via-white to-white py-10 px-6 md:px-36 leading-relaxed text-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Privacy Policy</h1>
        <p className="mb-6 text-sm sm:text-base">
          Last updated: <strong>October 2025</strong>
        </p>

        <p className="mb-6">
          At <strong>Hecademy</strong>, your privacy is our top priority. This Privacy Policy
          explains how we collect, use, and protect your personal information when you
          interact with our website, mobile application, and services. We are committed
          to transparency and ensuring that you have full control over your data.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
          1. Information We Collect
        </h2>
        <p className="mb-4">
          Hecademy collects both personal and non-personal information to enhance your
          learning experience. We may collect the following categories of data:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>
            <strong>Account Information:</strong> Name, email address, profile photo,
            and authentication details used to register or sign in.
          </li>
          <li>
            <strong>Course Data:</strong> Progress, quiz results, watch time, and
            certification records to track learning performance.
          </li>
          <li>
            <strong>Device & Usage Information:</strong> Browser type, IP address,
            device identifiers, and pages visited — used to optimize app performance.
          </li>
          <li>
            <strong>Payment Information:</strong> Processed securely by third-party
            payment providers (Hecademy does not store card details).
          </li>
          <li>
            <strong>Communication Data:</strong> Messages, feedback, or queries sent
            through our contact forms, discussions, or support channels.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
          2. How We Use Your Information
        </h2>
        <p className="mb-6">
          We use your data responsibly and only for legitimate educational and
          operational purposes, including:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>To personalize your dashboard and learning recommendations.</li>
          <li>To analyze your progress and award certificates upon course completion.</li>
          <li>To communicate updates, course reminders, and system notifications.</li>
          <li>To improve our platform’s performance, design, and user experience.</li>
          <li>To ensure platform security and prevent unauthorized access.</li>
          <li>
            To comply with applicable laws, educational regulations, and contractual
            obligations.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
          3. Cookies and Tracking Technologies
        </h2>
        <p className="mb-6">
          Hecademy uses cookies, analytics tools, and similar technologies to enhance
          functionality and gather insights into platform usage. Cookies help us
          remember your preferences, maintain your login session, and provide tailored
          recommendations. You can control or disable cookies through your browser
          settings, though some features may be limited as a result.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
          4. Data Sharing and Disclosure
        </h2>
        <p className="mb-4">
          We respect your data privacy and never sell or rent your information. We may
          share your information only in the following cases:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>
            <strong>Service Providers:</strong> Trusted partners (e.g., hosting,
            analytics, payment gateways) that assist us in operations.
          </li>
          <li>
            <strong>Legal Requirements:</strong> When disclosure is required to comply
            with the law, government requests, or to protect our rights.
          </li>
          <li>
            <strong>Business Transfers:</strong> In the event of a merger, acquisition,
            or restructuring, your data may be securely transferred to new management.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
          5. Data Retention
        </h2>
        <p className="mb-6">
          We retain your data only as long as necessary to provide you with our
          services or as required by law. Once your account is deleted or inactive for
          an extended period, your personal information will be securely removed from
          our systems. Certain anonymized analytics data may be retained for research
          and platform improvement purposes.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
          6. Security Measures
        </h2>
        <p className="mb-6">
          We implement advanced security practices to protect your data from
          unauthorized access, alteration, or misuse. This includes HTTPS encryption,
          secured APIs, access controls, and periodic audits. While we follow industry
          standards, no system is 100% secure — and we encourage you to use strong,
          unique passwords and enable multi-factor authentication where possible.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
          7. Your Rights and Choices
        </h2>
        <p className="mb-6">
          As a user, you have the right to control your personal information. Depending
          on your jurisdiction, you may:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>Access and review the data we hold about you.</li>
          <li>Request correction or deletion of inaccurate information.</li>
          <li>Withdraw consent for specific data processing activities.</li>
          <li>Opt out of marketing emails and notifications.</li>
          <li>
            Export your course data and progress for personal records upon request.
          </li>
        </ul>
        <p className="mb-6">
          To exercise these rights, contact us at{" "}
          <span className="text-blue-500">privacy@hecademy.com</span>. We’ll respond
          within 7 business days.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
          8. International Data Transfers
        </h2>
        <p className="mb-6">
          As a global learning platform, Hecademy may process data on servers located
          outside your home country. Regardless of where your data is processed, we
          ensure the same high level of protection through compliance with GDPR,
          ISO/IEC 27001, and other international privacy standards.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
          9. Children’s Privacy
        </h2>
        <p className="mb-6">
          Our platform is intended for users aged 13 and above. We do not knowingly
          collect personal data from children under 13. If you believe a child has
          provided us with personal information, please contact us immediately so that
          we can delete it.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
          10. Email Communications
        </h2>
        <p className="mb-6">
          By registering with Hecademy, you consent to receive transactional and
          informational emails (e.g., course updates, certificate alerts). You may
          unsubscribe from non-essential communications at any time via your account
          settings or the “unsubscribe” link in our emails.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
          11. Third-Party Links
        </h2>
        <p className="mb-6">
          Our website may contain links to third-party websites or tools for
          convenience. Hecademy is not responsible for their privacy practices or
          content. We encourage you to review their respective privacy policies before
          interacting with them.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
          12. Updates to This Policy
        </h2>
        <p className="mb-6">
          We may update this Privacy Policy periodically to reflect changes in our
          practices, technology, or legal requirements. When updates occur, we will
          notify users through our platform or via email. The “Last Updated” date at
          the top of this page indicates the most recent revision.
        </p>

        <p className="text-sm text-gray-500 italic">
          By using Hecademy, you acknowledge that you have read, understood, and
          agreed to this Privacy Policy.
        </p>
      </div>

      <Footer />
    </>
  );
};

export default PrivacyPolicy;
