import { sendEmail } from "../utils/sendEmail.js";

/**
 * ✅ Contact Form Submission Controller
 */
export const handleContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.json({ success: false, message: "All fields are required." });
    }

    // Send to admin
    await sendEmail({
      to: process.env.ADMIN_EMAIL || "support@hecademy.com",
      subject: `New Contact Form Message: ${subject}`,
      html: `
        <h2>New Message from Hecademy Contact Form</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Subject:</b> ${subject}</p>
        <p><b>Message:</b></p>
        <p style="white-space:pre-line;">${message}</p>
        <hr />
        <p>— Hecademy Contact System</p>
      `,
    });

    // Auto-acknowledgment email to sender
    await sendEmail({
      to: email,
      subject: "We’ve received your message – Hecademy Support",
      html: `
        <h2>Hi ${name},</h2>
        <p>Thank you for reaching out to Hecademy! We’ve received your message and our team will get back to you within 24–48 hours.</p>
        <p>Meanwhile, you can visit our Help Center or check your dashboard for updates.</p>
        <br/>
        <p>Warm regards,</p>
        <p><b>The Hecademy Support Team</b></p>
      `,
    });

    res.json({ success: true, message: "Message sent successfully." });
  } catch (error) {
    console.error("Contact form error:", error);
    res.json({ success: false, message: "Failed to send message." });
  }
};
