import type { Metadata } from "next";
import LandingClient from "./components/LandingClient";

export const metadata: Metadata = {
  title: "ExamAI – AI Tutor for UPSC, JEE, NEET, SSC in India",
  description: "Ask AI tutors, take PYQ mock tests, read daily current affairs, and get live job alerts for UPSC, JEE, NEET, SSC and more.",
  openGraph: {
    title: "ExamAI – AI Tutor for Every Competitive Exam",
    description: "UPSC, JEE, NEET, SSC, Banking — AI-powered exam prep",
    url: "https://examai-in.com",
    siteName: "ExamAI",
    images: [{ url: "https://examai-in.com/og-image.png", width: 1200, height: 630 }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ExamAI – AI Tutor for India",
    description: "UPSC, JEE, NEET, SSC exam prep powered by AI",
    images: ["https://examai-in.com/og-image.png"],
  },
  alternates: { canonical: "https://examai-in.com" },
  robots: { index: true, follow: true },
};

export default function Page() {
  return (
    <>
      <main style={{ background: "#F9F6EE", color: "#1a1a1a", fontFamily: "sans-serif" }}>
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "120px 60px 80px" }}>
          <h1 style={{ fontSize: "clamp(32px,5vw,60px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
            Don&apos;t Just Study —{" "}
            <span style={{ color: "#00674f" }}>Let AI Build Your Career</span>
          </h1>
          <p style={{ fontSize: 18, color: "#475569", lineHeight: 1.7, maxWidth: 560, marginBottom: 32 }}>
            Ask AI tutors, take PYQ mock tests, read daily current affairs,
            and get live job alerts for UPSC, JEE, NEET, SSC, Banking and more.
            India&apos;s most complete exam prep platform.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 60 }}>
            {["UPSC","JEE","NEET","CLAT-UG","CUET-UG","NDA","UGC-NET","SSC","Banking","Railway","CAT","State PCS"].map(exam => (
              <span key={exam} style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid rgba(0,103,79,0.3)", color: "#00674f", fontSize: 13, background: "rgba(0,103,79,0.08)" }}>
                {exam}
              </span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 20 }}>
            {[
              { icon: "🤖", title: "AI Tutor", desc: "Ask any exam question and get instant explanations" },
              { icon: "📝", title: "Mock Tests", desc: "Practice PYQs for UPSC, JEE, NEET, SSC and more" },
              { icon: "📰", title: "Current Affairs", desc: "Daily AI-curated news with exam relevance tags" },
              { icon: "💼", title: "Job Alerts", desc: "Real-time government job notifications" },
            ].map(f => (
              <div key={f.title} style={{ background: "#FFFFFF", border: "1px solid #E0E0E0", borderRadius: 16, padding: 24, boxShadow: "0 8px 32px #E0E0E0" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: "#1a1a1a" }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <LandingClient />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "ExamAI",
        "description": "AI tutor for UPSC, JEE, NEET, SSC, Banking exams in India",
        "url": "https://examai-in.com",
        "applicationCategory": "EducationApplication",
        "operatingSystem": "Web, Android, iOS",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR" },
        "audience": { "@type": "Audience", "audienceType": "Students preparing for competitive exams in India" }
      })}} />
    </>
  );
}
