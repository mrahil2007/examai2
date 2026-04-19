import type { Metadata } from "next";
import { UserProvider } from "@/context/UserContext";
import Script from "next/script";

export const metadata: Metadata = {
  title: "ExamAI – AI Tutor for Every Competitive Exam in India",
  description: "Ask AI tutors, take PYQ mock tests, read daily current affairs, and get live job alerts for UPSC, JEE, NEET, SSC and more.",
  keywords: "JEE preparation, NEET study, UPSC AI tutor, SSC exam practice, AI quiz India, job alerts India",
  robots: "index, follow",
  openGraph: {
    title: "ExamAI – AI Tutor for Every Competitive Exam in India",
    description: "Ask AI tutors, take PYQ mock tests, read daily current affairs, and get live job alerts for UPSC, JEE, NEET, SSC and more.",
    url: "https://examai-in.com",
    type: "website",
    images: [{ url: "https://examai-in.com/exam_ai_icon_512.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ExamAI – AI Tutor for Every Competitive Exam in India",
    description: "Personalized AI practice for Indian students.",
    images: ["https://examai-in.com/exam_ai_icon_512.png"],
  },
  alternates: {
    canonical: "https://examai-in.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

        {/* ✅ Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6816753251540275"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}