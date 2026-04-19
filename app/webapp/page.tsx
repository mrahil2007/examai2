import type { Metadata } from "next";
import LandingClient from "../components/LandingClient";

export const metadata: Metadata = {
  title: "ExamAI Web App",
  description: "ExamAI web app with Ask AI, Mock Tests, Current Affairs, Jobs, and Resume tools.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://examai-in.com/webapp" },
};

export default function WebAppPage() {
  return <LandingClient forceWebApp />;
}
