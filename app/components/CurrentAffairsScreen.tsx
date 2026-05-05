"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ── AdSense global declaration ─────────────────────────────────────────────────
declare global { interface Window { adsbygoogle: unknown[]; } }

// ── AdBanner component ─────────────────────────────────────────────────────────
function AdBanner() {
  useEffect(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
  }, []);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", width: "100%", minHeight: 60 }}
      data-ad-client="ca-pub-6816753251540275"
      data-ad-slot="YOUR_AD_SLOT_ID"   // ← Replace with your actual Ad Slot ID from AdSense
      data-ad-format="horizontal"
      data-full-width-responsive="true"
    />
  );
}

const CAT_CONFIG: Record<string, { icon: string; color: string }> = {
  National:        { icon: "🇮🇳", color: "#f97316" },
  International:   { icon: "🌍", color: "#3b82f6" },
  Economy:         { icon: "📈", color: "#16a34a" },
  "Science & Tech":{ icon: "🔬", color: "#a855f7" },
  Sports:          { icon: "🏆", color: "#ca8a04" },
  Environment:     { icon: "🌿", color: "#059669" },
  Awards:          { icon: "🎖️", color: "#d97706" },
  Defence:         { icon: "🛡️", color: "#6366f1" },
  Health:          { icon: "💊", color: "#db2777" },
};

interface CAItem {
  id?: string;
  category: string;
  headline: string;
  summary: string;
  examRelevance?: string;
  importance?: string;
  tags?: string[];
}

function NewsCard({ item, style }: { item: CAItem; isActive: boolean; style: React.CSSProperties }) {
  const cat = CAT_CONFIG[item.category] || { icon: "📌", color: "#64748b" };
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", transition: "transform 0.45s cubic-bezier(0.32,0.72,0,1), opacity 0.35s ease", willChange: "transform", ...style }}>
      <div style={{
        flex: 1, margin: "0 0 12px",
        background: "#FFFFFF",
        borderRadius: 20,
        border: "1px solid #E0E0E0",
        boxShadow: "0 4px 24px #E0E0E0",
        display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
      }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${cat.color}, transparent)`, flexShrink: 0 }} />
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 20px", scrollbarWidth: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${cat.color}15`, border: `1px solid ${cat.color}30`, borderRadius: 20, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, color: cat.color }}>
              {cat.icon} {item.category}
            </span>
            {item.importance === "high" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20, padding: "3px 8px", fontSize: "0.68rem", fontWeight: 700, color: "#dc2626" }}>
                🔴 MUST READ
              </span>
            )}
          </div>
          <h2 style={{ margin: "0 0 14px", fontSize: "clamp(1.05rem, 3vw, 1.25rem)", fontWeight: 800, color: "#0f172a", lineHeight: 1.35, letterSpacing: "-0.01em" }}>
            {item.headline}
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: "0.88rem", color: "#475569", lineHeight: 1.7, whiteSpace: "pre-line" }}>{item.summary}</p>
          {item.examRelevance && (
            <div style={{ padding: "10px 14px", background: "rgba(77,140,122,0.06)", border: "1px solid rgba(77,140,122,0.18)", borderRadius: 10, marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#4d8c7a", fontWeight: 600, marginBottom: 4 }}>📚 Exam Relevance</p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#3a7a6a", lineHeight: 1.5 }}>{item.examRelevance}</p>
            </div>
          )}
          {item.tags && item.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              {item.tags.map(tag => (
            <span key={tag} style={{ background: "#F9F6EE", border: "1px solid #E0E0E0", borderRadius: 6, padding: "2px 8px", fontSize: "0.7rem", color: "#64748b" }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  exam: string;
  API_URL: string;
}

export default function CurrentAffairsScreen({ exam, API_URL }: Props) {
  const [affairs, setAffairs] = useState<CAItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir] = useState<"up" | "down" | null>(null);
  const [isAnimating, setIsAnim] = useState(false);
  const [filter, setFilter] = useState("All");
  const [retryCount, setRetryCount] = useState(0);

  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseURL = API_URL?.replace(/\/$/, "") || "";

  useEffect(() => {
    if (!baseURL) { setError("API URL is not configured."); setLoading(false); return; }
    if (!exam) { setError("Exam is not selected."); setLoading(false); return; }

    let cancelled = false;
    const load = async (attempt = 0) => {
      setLoading(true); setError(null);
      try {
        const url = `${baseURL}/current-affairs/${encodeURIComponent(exam)}?lang=english`;
        console.log("[CurrentAffairs] Fetching:", url);
        const res = await fetch(url);
        if (res.status === 429) {
          if (attempt < 3 && !cancelled) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            if (!cancelled) load(attempt + 1);
          } else if (!cancelled) { setError("Server busy. Please try again in a moment."); setLoading(false); }
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) { setAffairs(data.affairs || []); setCurrent(0); }
      } catch (err) {
        console.error("[CurrentAffairs] Fetch error:", err);
        if (!cancelled) setError("Could not load news. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(() => { if (!cancelled) load(); }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [exam, baseURL, retryCount]);

  const filtered = filter === "All" ? affairs : affairs.filter(a => a.category === filter);
  const categories = ["All", ...Object.keys(CAT_CONFIG).filter(c => affairs.some(a => a.category === c))];

  const navigate = useCallback((dir: "up" | "down") => {
    if (isAnimating) return;
    const next = dir === "up" ? current + 1 : current - 1;
    if (next < 0 || next >= filtered.length) return;
    setAnimDir(dir); setIsAnim(true);
    setTimeout(() => { setCurrent(next); setAnimDir(null); setIsAnim(false); }, 420);
  }, [isAnimating, current, filtered.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") navigate("up");
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") navigate("down");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) navigate(dy > 0 ? "up" : "down");
    touchStartY.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    if (wheelTimeout.current) return;
    navigate(e.deltaY > 0 ? "up" : "down");
    wheelTimeout.current = setTimeout(() => { wheelTimeout.current = null; }, 600);
  };

  const getCardStyle = (idx: number): React.CSSProperties => {
    const offset = idx - current;
    if (Math.abs(offset) > 1) return { display: "none" };
    let translateY = offset * 100, opacity = 1;
    if (animDir === "up") { if (offset === 0) translateY = -30; if (offset === 1) translateY = 100; }
    if (animDir === "down") { if (offset === 0) translateY = 30; if (offset === -1) translateY = -100; }
    if (offset !== 0) opacity = 0.3;
    return { transform: `translateY(${translateY}%)`, opacity };
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#F9F6EE", overflow: "hidden", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ padding: "12px 16px 10px", flexShrink: 0, borderBottom: "1px solid #E0E0E0", background: "#FFFFFF" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.50rem", fontWeight: 800, color: "#4d8c7a" }}>Top News</h1>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8" }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
          {categories.map(cat => {
            const cfg = CAT_CONFIG[cat];
            const isActive = filter === cat;
            return (
              <button key={cat} onClick={() => { setFilter(cat); setCurrent(0); }}
              style={{ flexShrink: 0, background: isActive ? cfg ? `${cfg.color}15` : "rgba(77,140,122,0.1)" : "#F9F6EE", border: `1px solid ${isActive ? (cfg?.color || "#4d8c7a") + "40" : "#E0E0E0"}`, borderRadius: 20, padding: "4px 12px", color: isActive ? cfg?.color || "#4d8c7a" : "#94a3b8", fontSize: "0.72rem", fontWeight: isActive ? 700 : 500, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}>
                {cfg ? `${cfg.icon} ` : ""}{cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── AdSense banner below header ── */}
      <div style={{ flexShrink: 0, background: "#FFFFFF", borderBottom: "1px solid #E0E0E0", padding: "6px 16px" }}>
        <AdBanner />
      </div>

      {/* Main */}
      {loading ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #E0E0E0", borderTop: "3px solid #4d8c7a", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "#94a3b8", fontSize: "0.82rem", margin: 0 }}>Fetching today&apos;s news...</p>
        </div>
      ) : error ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
          <span style={{ fontSize: "2.5rem" }}>📡</span>
          <p style={{ color: "#94a3b8", fontSize: "0.88rem", margin: 0, textAlign: "center" }}>{error}</p>
          <button onClick={() => setRetryCount(c => c + 1)}
            style={{ background: "rgba(77,140,122,0.1)", border: "1px solid rgba(77,140,122,0.25)", borderRadius: 10, padding: "8px 20px", color: "#4d8c7a", fontSize: "0.82rem", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#94a3b8", fontSize: "0.88rem" }}>No news found for this filter.</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div ref={containerRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onWheel={onWheel}
            style={{ flex: 1, position: "relative", padding: "10px 14px 0", userSelect: "none" }}>
            {filtered.map((item, idx) => {
              if (Math.abs(idx - current) > 1) return null;
              return <NewsCard key={item.id || idx} item={item} isActive={idx === current} style={getCardStyle(idx)} />;
            })}
          </div>

          {/* Right nav */}
          <div style={{ width: 44, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, paddingRight: 8 }}>
            <button onClick={() => navigate("down")} disabled={current === 0}
            style={{ width: 36, height: 36, borderRadius: "50%", background: current === 0 ? "#F9F6EE" : "rgba(77,140,122,0.1)", border: `1px solid ${current === 0 ? "#E0E0E0" : "rgba(77,140,122,0.25)"}`, color: current === 0 ? "#cbd5e1" : "#4d8c7a", fontSize: "1rem", cursor: current === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>▲</button>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, maxHeight: 120, overflowY: "hidden" }}>
              {filtered.slice(Math.max(0, current - 2), current + 5).map((_, i) => {
                const realIdx = Math.max(0, current - 2) + i;
                const isActive = realIdx === current;
                return (
                  <div key={realIdx} onClick={() => !isAnimating && setCurrent(realIdx)}
                    style={{ width: isActive ? 6 : 4, height: isActive ? 18 : 6, borderRadius: 3, background: isActive ? "#4d8c7a" : "#cbd5e1", cursor: "pointer", transition: "all 0.25s", flexShrink: 0 }} />
                );
              })}
            </div>

            <button onClick={() => navigate("up")} disabled={current >= filtered.length - 1}
            style={{ width: 36, height: 36, borderRadius: "50%", background: current >= filtered.length - 1 ? "#F9F6EE" : "rgba(77,140,122,0.1)", border: `1px solid ${current >= filtered.length - 1 ? "#E0E0E0" : "rgba(77,140,122,0.25)"}`, color: current >= filtered.length - 1 ? "#cbd5e1" : "#4d8c7a", fontSize: "1rem", cursor: current >= filtered.length - 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>▼</button>
          </div>
        </div>
      )}

      {/* Bottom counter + Ad */}
      {!loading && !error && filtered.length > 0 && (
        <>
          {/* ── AdSense banner above bottom counter ── */}
          <div style={{ flexShrink: 0, background: "#FFFFFF", borderTop: "1px solid #E0E0E0", padding: "6px 16px 0" }}>
            <AdBanner />
          </div>

          <div style={{ padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderTop: "1px solid #E0E0E0", background: "#FFFFFF", flexShrink: 0 }}>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{current + 1} / {filtered.length}</span>
            <div style={{ flex: 1, maxWidth: 180, height: 2, background: "#E0E0E0", borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${((current + 1) / filtered.length) * 100}%`, background: "linear-gradient(90deg, #4d8c7a, #3a7a6a)", borderRadius: 1, transition: "width 0.3s ease" }} />
            </div>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{filtered.length} stories</span>
          </div>
        </>
      )}
    </div>
  );
}