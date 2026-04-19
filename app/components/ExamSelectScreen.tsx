"use client";
import { useState, useEffect } from "react";
import { G, EXAMS, EXAM_META } from "@/lib/theme";

interface ExamSelectScreenProps {
  onSelect: (exam: string) => void;
  currentExam?: string;
}

export default function ExamSelectScreen({ onSelect, currentExam }: ExamSelectScreenProps) {
  const [selected, setSelected] = useState<string | null>(currentExam || null);
  const [leaving, setLeaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("examai_exam");
      setSelected(saved || currentExam || null);
    }
  }, [currentExam]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateViewport = () => setIsMobile(window.innerWidth <= 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const handleSelect = (e: string) => {
    setSelected(e);
    if (typeof window !== "undefined") localStorage.setItem("examai_exam", e);
  };

  const handleContinue = () => {
    if (!selected) return;
    setLeaving(true);
    setTimeout(() => onSelect(selected), 350);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 220, background: "#F9F6EE",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      opacity: leaving ? 0 : 1,
      transform: leaving ? "scale(0.96)" : "scale(1)",
      transition: "all 0.35s ease",
    }}>
      <style>{`
        @keyframes cardIn {
          from { opacity:0; transform:translateY(20px) scale(0.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .exc-card { transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .exc-card:active { transform:scale(0.92) !important; }
      `}</style>

      {/* Background glow */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "10%", left: "30%",
          width: 300, height: 300,
          background: `radial-gradient(circle,${G.glow},transparent 70%)`,
          filter: "blur(80px)",
        }} />
      </div>

      <div style={{
        height: "100%", overflowY: "auto",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)",
      }}>
      <div
        style={{
          width: "100%",
          maxWidth: 500,
            padding: selected && isMobile ? "40px 20px 140px" : "40px 20px 30px",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: `linear-gradient(135deg,${G.gold},${G.saffron})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, margin: "0 auto 14px",
            boxShadow: `0 8px 30px ${G.glow}`,
          }}>🎓</div>
          <div style={{
            fontFamily: "'Bricolage Grotesque', serif",
            fontSize: "1.7rem", fontWeight: 900,
            color: G.text, letterSpacing: -0.5,
          }}>
            Choose Your <span style={{ color: G.gold }}>Exam</span>
          </div>
          <div style={{ fontSize: "0.82rem", color: G.muted, marginTop: 6 }}>
            {currentExam
              ? `Currently: ${currentExam} · Switch exam`
              : "Select your target exam to begin"}
          </div>
        </div>

        {/* Exam grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {EXAMS.map((e, i) => {
            const meta = EXAM_META[e];
            const isSelected = selected === e;
            return (
              <button
                key={e}
                className="exc-card"
                onClick={() => handleSelect(e)}
                style={{
                  padding: "14px 12px", borderRadius: 14,
              background: isSelected ? `${meta.color}18` : "#FFFFFF",
              border: `1.5px solid ${isSelected ? meta.color : "#E0E0E0"}`,
                  cursor: "pointer", textAlign: "left",
                  animation: `cardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i * 50 + 150}ms both`,
                  transform: isSelected ? "scale(1.02)" : "scale(1)",
              boxShadow: isSelected ? `0 8px 24px ${meta.color}25` : "0 4px 16px #E0E0E0",
                  position: "relative", fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6, lineHeight: 1 }}>{meta.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: G.text, marginBottom: 2 }}>{e}</div>
                <div style={{ fontSize: "0.67rem", color: G.muted }}>{meta.desc}</div>
                {isSelected && (
                  <div style={{
                    position: "absolute", top: 8, right: 8,
                    width: 16, height: 16, borderRadius: "50%",
                    background: meta.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* Continue button Desktop */}
      {selected && !isMobile && (
        <div style={{ width: "100%", maxWidth: 500, padding: "0 20px 30px" }}>
          <button
            onClick={handleContinue}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 14,
              background: `linear-gradient(135deg,${G.gold},${G.saffron})`,
              border: "none",
              color: "#000",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: `0 8px 24px ${G.glow}`,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {selected === currentExam
              ? `Continue with ${selected} →`
              : `Switch to ${selected} →`}
          </button>
        </div>
      )}
      </div>

      {/* Continue button Mobile */}
      {selected && isMobile && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 4,
            padding: "12px 16px calc(12px + env(safe-area-inset-bottom,0px))",
            background: "linear-gradient(180deg, rgba(249,246,238,0) 0%, rgba(249,246,238,0.94) 35%, rgba(249,246,238,1) 100%)",
          }}
        >
          <div style={{ width: "100%", maxWidth: 500, margin: "0 auto" }}>
            <button
              onClick={handleContinue}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 14,
                background: `linear-gradient(135deg,${G.gold},${G.saffron})`,
                border: "none",
                color: "#000",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: `0 8px 24px ${G.glow}`,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {selected === currentExam
                ? `Continue with ${selected} →`
                : `Switch to ${selected} →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
