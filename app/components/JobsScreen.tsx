"use client";
import { useState, useEffect, useRef } from "react";
import { G } from "@/lib/theme";

interface Job {
  _id: string;
  title: string;
  organization?: string;
  category?: string;
  location?: string;
  country?: string;
  salary?: string;
  vacancies?: string;
  lastDate?: string;
  isNew?: boolean;
  source?: string;
  applyLink?: string;
}

interface Props {
  exam: string;
  API_URL: string;
  onAskAI: (prompt: string) => void;
}

const FILTERS: [string, string][] = [
  ["all", "All Jobs"],
  ["govt", "Govt"],
  ["pvt", "Pvt"],
  ["international", "🌍 International"],
];

export default function JobsScreen({ exam, API_URL, onAskAI }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FIX: Remove trailing slash from API_URL
  const baseURL = API_URL?.replace(/\/$/, "") || "";

  const fetchJobs = async (pg = 1, f = filter, q = search) => {
    // FIX: Guard against missing API_URL or exam
    if (!baseURL) {
      setError("API URL is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({
        page: String(pg), limit: "20",
        ...(f === "govt" ? { category: "government" } : {}),
        ...(f === "pvt" ? { category: "private" } : {}),
        ...(f === "international" ? { category: "international" } : {}),
        ...(q.trim() ? { search: q.trim() } : {}),
      });
      

      // FIX: Use baseURL instead of API_URL directly
      const url = `${baseURL}/jobs?${params}`;
      console.log("[JobsScreen] Fetching:", url); // FIX: debug log

      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (pg === 1) setJobs(d.jobs || []);
      else setJobs(prev => [...prev, ...(d.jobs || [])]);
      setTotal(d.total || 0);
      setPage(pg);
    } catch (err) {
      console.error("[JobsScreen] Fetch error:", err); // FIX: log actual error
      setError("Could not load jobs. Check your connection.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs(1, filter, search);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, exam, baseURL]); // FIX: added baseURL as dependency

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchJobs(1, filter, val), 500);
  };

  const handleAskAI = (job: Job) => {
    const isIntl = job.category === "international";
    const prompt = isIntl
      ? `I want complete information about this international job:\n\n📌 **${job.title}**\n🏢 Organization: ${job.organization}\n📍 Location: ${job.location || "N/A"}\n💰 Salary: ${job.salary}\n\nPlease provide:\n1. ✅ **Eligibility Criteria**\n2. 📚 **Role & Responsibilities**\n3. 💰 **Salary & Benefits**\n4. 📅 **How to Apply**\n5. 📖 **Preparation Tips**\n6. 🎯 **Selection Process**`
      : `I want complete information about this government job:\n\n📌 **${job.title}**\n🏢 Organization: ${job.organization}\n\nPlease provide:\n1. ✅ **Eligibility Criteria**\n2. 📚 **Complete Syllabus**\n3. 💰 **Salary & Benefits**\n4. 📅 **Study Plan**\n5. 📖 **Best Books**\n6. 🎯 **Selection Process**`;
    onAskAI(prompt);
  };

  const getCategoryTag = (job: Job) => {
    if (job.category === "government") return { label: "GOVT", bg: "rgba(240,165,0,0.1)", color: G.gold, border: G.border };
    if (job.category === "private") return { label: "PVT", bg: "rgba(99,102,241,0.1)", color: "#818cf8", border: "rgba(99,102,241,0.25)" };
    if (job.category === "international") return { label: "INTL", bg: "rgba(20,184,166,0.1)", color: G.teal, border: "rgba(20,184,166,0.25)" };
    return null;
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#F9F6EE", color: G.text, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid #E0E0E0`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: "0.98rem", display: "flex", alignItems: "center", gap: 8 }}>
            <span>💼</span>Job Alerts
          </div>
          <div style={{ fontSize: "0.7rem", color: G.muted }}>{total} jobs found</div>
        </div>
        <input type="text" placeholder="🔍 Search jobs or organization..." value={search} onChange={handleSearchChange}
          style={{ width: "100%", padding: "9px 14px", marginBottom: 10, background: "#FFFFFF", border: `1px solid ${search ? G.gold : "#E0E0E0"}`, borderRadius: 10, color: G.text, fontSize: "0.82rem", outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: "border-box", transition: "border-color 0.2s" }} />
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {FILTERS.map(([f, label]) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "7px 16px", borderRadius: 100, background: filter === f ? `linear-gradient(135deg,${G.gold},${G.saffron})` : "#FFFFFF", border: `1px solid ${filter === f ? G.gold : "#E0E0E0"}`, color: filter === f ? "#000" : G.muted, fontSize: "0.78rem", fontWeight: filter === f ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {loading && jobs.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "50vh", gap: 14 }}>
            <div style={{ width: 40, height: 40, border: `3px solid #E0E0E0`, borderTopColor: G.gold, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: G.muted, fontSize: "0.85rem" }}>Loading job alerts...</div>
          </div>
        )}

        {error && (
          <div style={{ background: `${G.error}15`, border: `1px solid ${G.error}40`, borderRadius: 12, padding: "14px 16px", color: G.error, fontSize: "0.84rem", margin: "8px 0", textAlign: "center" }}>
            ⚠️ {error}<br />
            {/* FIX: Retry works correctly - calls fetchJobs directly */}
            <button onClick={() => fetchJobs(1, filter, search)} style={{ marginTop: 8, background: "transparent", border: `1px solid ${G.error}`, borderRadius: 6, color: G.error, padding: "5px 12px", cursor: "pointer", fontSize: "0.78rem", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Retry</button>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{search ? "🔍" : filter === "international" ? "🌍" : "💼"}</div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem", color: G.text, marginBottom: 6 }}>
              {search ? `No results for "${search}"` : filter === "international" ? "No international jobs yet" : "No jobs found"}
            </div>
            <div style={{ fontSize: "0.82rem", color: G.muted, lineHeight: 1.6 }}>
              {search ? "Try a different keyword or clear the search" : "Job alerts are fetched every 6 hours from official sources."}
            </div>
            {search && (
              <button onClick={() => { setSearch(""); fetchJobs(1, filter, ""); }} style={{ marginTop: 12, background: "transparent", border: `1px solid #E0E0E0`, borderRadius: 8, color: G.muted, padding: "6px 14px", cursor: "pointer", fontSize: "0.78rem", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Clear search</button>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {jobs.map(job => {
            const catTag = getCategoryTag(job);
            return (
              <div key={job._id} style={{ background: "#FFFFFF", border: `1px solid ${job.isNew ? G.border : "#E0E0E0"}`, borderRadius: 14, padding: "16px 14px", transition: "all 0.2s", position: "relative", overflow: "hidden", boxShadow: "0 2px 8px #E0E0E0" }}>
                {job.isNew && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${G.gold},${G.saffron})` }} />}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: G.text, marginBottom: 4, lineHeight: 1.4 }}>{job.title}</div>
                    <div style={{ fontSize: "0.76rem", color: G.muted, marginBottom: 4 }}>{job.organization}</div>
                    {job.category === "international" && job.location && <div style={{ fontSize: "0.74rem", color: G.teal, marginBottom: 6 }}>📍 {job.location}</div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {job.isNew && <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 100, background: "rgba(20,184,166,0.12)", color: G.teal, border: "1px solid rgba(20,184,166,0.25)", fontWeight: 600 }}>NEW</span>}
                      {catTag && <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 100, background: catTag.bg, color: catTag.color, border: `1px solid ${catTag.border}`, fontWeight: 600 }}>{catTag.label}</span>}
                      {job.salary && job.salary !== "As per govt norms" && job.salary !== "As per company norms" && <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 100, background: G.surf2, color: G.muted, border: `1px solid #E0E0E0` }}>💰 {job.salary}</span>}
                      {job.lastDate && job.lastDate !== "See official site" && <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 100, background: G.surf2, color: G.muted, border: `1px solid #E0E0E0` }}>📅 {job.lastDate}</span>}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: G.muted }}>Source: {job.source}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleAskAI(job)} style={{ background: `linear-gradient(135deg,rgba(77,140,122,0.15),rgba(13,148,136,0.15))`, border: `1px solid ${G.border}`, color: G.goldL, fontSize: "0.72rem", fontWeight: 700, padding: "7px 12px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>🤖 Ask AI</button>
                    {/* FIX: safer applyLink handler */}
                    <button
                      onClick={() => { if (job.applyLink) window.open(job.applyLink, "_blank", "noopener,noreferrer"); }}
                      disabled={!job.applyLink}
                      style={{ background: "transparent", border: `1px solid #E0E0E0`, color: job.applyLink ? G.muted : "#E0E0E0", fontSize: "0.72rem", padding: "7px 12px", borderRadius: 8, cursor: job.applyLink ? "pointer" : "not-allowed", whiteSpace: "nowrap", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Apply →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {jobs.length < total && !loading && (
          <button onClick={() => fetchJobs(page + 1, filter, search)} style={{ width: "100%", marginTop: 12, padding: "12px", background: "#FFFFFF", border: `1px solid #E0E0E0`, borderRadius: 10, color: G.muted, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Load More</button>
        )}
        {loading && jobs.length > 0 && <div style={{ textAlign: "center", padding: "16px", color: G.muted, fontSize: "0.82rem" }}>Loading more...</div>}
      </div>
    </div>
  );
}