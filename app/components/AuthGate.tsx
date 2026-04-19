"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  :root {
    --teal: #4d8c7a; --teal-l: #3a7a6a;
    --teal-dim: rgba(77,140,122,0.1); --teal-glow: rgba(77,140,122,0.2);
    --border: rgba(0,0,0,0.08); --border-t: rgba(77,140,122,0.2);
    --text: #0f172a; --text2: #475569; --text3: #94a3b8;
    --card: #FFFFFF; --bg: #F9F6EE;
    --font-h: 'Bricolage Grotesque', sans-serif;
    --font-b: 'Plus Jakarta Sans', sans-serif;
  }
`;

interface AuthGateProps {
  children: React.ReactNode;
  onOpenAuth: () => void;
}

export default function AuthGate({ children, onOpenAuth }: AuthGateProps) {
  const { user, loading } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Avoid SSR flash
  if (!mounted || loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <style>{css}</style>
        <div style={{ display: "flex", gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%", background: "#4d8c7a",
              animation: `bounce 0.8s ${i * 0.15}s infinite`,
            }} />
          ))}
        </div>
        <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <style>{css}</style>
        <div style={{
          background: "var(--card)",
          border: "1px solid #E0E0E0",
          boxShadow: "0 4px 24px #E0E0E0",
          borderRadius: 24, padding: "48px 36px", maxWidth: 400, width: "100%",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
          <div style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 22, fontWeight: 800, color: "#0f172a",
            marginBottom: 10, letterSpacing: -0.5,
          }}>
            Sign in to continue
          </div>
          <p style={{
            fontSize: 14, color: "#64748b", lineHeight: 1.7, marginBottom: 28,
          }}>
            This feature is available for registered users. Create a free account to access mock tests, resume builder and more.
          </p>
          <button
            onClick={onOpenAuth}
            style={{
              width: "100%", padding: "14px", background: "#4d8c7a",
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: "background 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#3a7a6a")}
            onMouseLeave={e => (e.currentTarget.style.background = "#4d8c7a")}
          >
            Sign Up Free →
          </button>
          <button
            onClick={onOpenAuth}
            style={{
              width: "100%", marginTop: 10, padding: "13px",
              background: "none", border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12, color: "#64748b", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(77,140,122,0.3)"; e.currentTarget.style.color = "#4d8c7a"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)"; e.currentTarget.style.color = "#64748b"; }}
          >
            Already have an account? Log In
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}