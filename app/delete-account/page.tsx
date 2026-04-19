import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete Account | ExamAI",
  description: "How to request account deletion and data removal for ExamAI.",
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0B1120",
  color: "#E8EEF8",
  padding: "40px 16px",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const cardStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  background: "#121e31",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "28px 22px",
  lineHeight: 1.75,
};

export default function DeleteAccountPage() {
  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <h1 style={{ marginTop: 0, marginBottom: 12, fontSize: "1.55rem", lineHeight: 1.25 }}>
          Data Deletion & Account Closure Request
        </h1>
        <p style={{ marginTop: 0, color: "#8FA3BE" }}>
          At ExamAI, we value your privacy. If you wish to delete your account and all associated data, use one of the methods below.
        </p>

        <h2 style={{ marginTop: 22, marginBottom: 8, fontSize: "1.1rem" }}>Method 1: In-App Deletion</h2>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li>Open the ExamAI app.</li>
          <li>Go to the <b>Insights</b> or <b>Sidebar</b> menu.</li>
          <li>Tap <b>Settings</b> &gt; <b>Delete Account</b>.</li>
          <li>Confirm your choice. Your chats, quiz history, and profile data are removed.</li>
        </ol>

        <h2 style={{ marginTop: 22, marginBottom: 8, fontSize: "1.1rem" }}>Method 2: Web-Based Request</h2>
        <p style={{ marginTop: 0 }}>
          If you have uninstalled the app, email <b>support@examai-in.com</b> with subject line <b>Account Deletion Request</b> and include your registered email address.
        </p>

        <h2 style={{ marginTop: 22, marginBottom: 8, fontSize: "1.1rem" }}>What data will be deleted?</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Personal Profile (Name, Email, UID)</li>
          <li>Your AI Chat History</li>
          <li>Mock Test & Quiz Results</li>
          <li>Custom Flashcards & Study Plans</li>
        </ul>

        <p style={{ marginTop: 18, color: "#8FA3BE", fontSize: "0.92rem" }}>
          Note: Data is usually removed within 48 hours of request processing.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
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
            href="/privacy-policy"
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
            View Privacy Policy
          </Link>
        </div>
      </section>
    </main>
  );
}
