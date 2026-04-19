import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | ExamAI",
  description: "Privacy policy for ExamAI and how we collect, use, and protect your data.",
};

const wrapper: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0B1120",
  color: "#E8EEF8",
  padding: "40px 16px",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const card: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  background: "#121e31",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "28px 22px",
};

const sectionTitle: React.CSSProperties = {
  marginBottom: 8,
  fontSize: "1.15rem",
};

const paragraph: React.CSSProperties = {
  marginTop: 0,
  color: "#CAD7EA",
  lineHeight: 1.75,
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "2026-03-18";

  return (
    <main style={wrapper}>
      <section style={card}>
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: "1.9rem", lineHeight: 1.2 }}>
          Privacy Policy for ExamAI
        </h1>
        <p style={{ marginTop: 0, marginBottom: 24, fontSize: "0.9rem", color: "#8FA3BE" }}>
          <b>Last Updated:</b> {lastUpdated}
        </p>

        <p style={paragraph}>
          Welcome to ExamAI. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
        </p>

        <h2 style={sectionTitle}>1. Information We Collect</h2>
        <p style={paragraph}>We may collect information about you in a variety of ways, including:</p>
        <ul style={{ paddingLeft: 20, lineHeight: 1.75, color: "#CAD7EA" }}>
          <li><b>Personal Data:</b> Name, email, and exam preferences you provide during registration.</li>
          <li><b>Chat and Interaction Data:</b> Prompts, uploaded files, and generated responses used to deliver and personalize the service.</li>
          <li><b>Quiz and Performance Data:</b> Topics attempted, scores, and time taken.</li>
          <li><b>Resume Data:</b> Information entered into Resume Builder features.</li>
          <li><b>Device Data:</b> Notification token (FCM token) for alerts like jobs and current affairs.</li>
          <li><b>Authentication Data:</b> Basic profile info from Google Sign-In (such as name and email).</li>
        </ul>

        <h2 style={sectionTitle}>2. How We Use Your Information</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.75, color: "#CAD7EA" }}>
          <li>Create and manage your account.</li>
          <li>Personalize your AI tutor experience.</li>
          <li>Provide chat, quiz, and resume features.</li>
          <li>Send relevant notifications.</li>
          <li>Analyze usage trends to improve the product.</li>
        </ul>

        <h2 style={sectionTitle}>3. Disclosure of Your Information</h2>
        <p style={paragraph}>
          We do not sell your personal information. We may share data with third-party service providers that help us operate the platform.
        </p>
        <ul style={{ paddingLeft: 20, lineHeight: 1.75, color: "#CAD7EA" }}>
          <li><b>AI Providers:</b> Groq, OpenAI, Google</li>
          <li><b>Search Providers:</b> Serper</li>
          <li><b>Image Services:</b> Infip, Catbox, and related providers</li>
          <li><b>Push Notifications:</b> Firebase Cloud Messaging</li>
        </ul>

        <h2 style={sectionTitle}>4. Data Security</h2>
        <p style={paragraph}>
          We use administrative, technical, and physical safeguards to protect your data. However, no system can be guaranteed 100% secure.
        </p>

        <h2 style={sectionTitle}>5. Data Retention and Deletion</h2>
        <p style={paragraph}>
          We retain personal data only as long as required for service delivery and legal compliance. You may request account/data deletion at any time. Deletion is irreversible and removes active data associated with your account.
        </p>

        <h2 style={sectionTitle}>6. Policy for Children</h2>
        <p style={paragraph}>
          We do not knowingly collect personal information from children under 13. If you believe such data has been collected, contact us and we will act promptly.
        </p>

        <h2 style={sectionTitle}>7. Changes to This Privacy Policy</h2>
        <p style={paragraph}>
          We may update this policy periodically. Continued use of the platform after updates indicates acceptance of the revised policy.
        </p>

        <h2 style={sectionTitle}>8. Contact Us</h2>
        <p style={{ ...paragraph, marginBottom: 0 }}>
          For questions about this Privacy Policy, contact us at{" "}
          <a href="mailto:support@examai-in.com" style={{ color: "#00b38a", textDecoration: "none", fontWeight: 700 }}>
            support@examai-in.com
          </a>.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
          <Link
            href="/"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              textDecoration: "none",
              background: "#00674f",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9rem",
            }}
          >
            Back to Home
          </Link>
          <Link
            href="/delete-account"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#E8EEF8",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            Data Deletion Page
          </Link>
        </div>
      </section>
    </main>
  );
}
