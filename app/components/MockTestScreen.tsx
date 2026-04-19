"use client";
import { useState, useEffect } from "react";
import { G, EXAMS, STATE_PCS_LIST, TOPIC_PH } from "@/lib/theme";

// ── SmartQuestionDisplay ──────────────────────────────────────────────────────
const isPipeTable = (t: string) => t.includes(" | ") && /[A-D]\.\s/.test(t);

interface TableData { h1: string; h2: string; rows: {leftLabel:string;left:string;rightLabel:string;right:string}[]; qLine: string; }
const parsePipeTable = (text: string): TableData => {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let h1 = "List I", h2 = "List II";
  const rows: TableData["rows"] = [];
  let qLine = "";
  for (const line of lines) {
    if (line.includes("|")) {
      const parts = line.split("|").map(p => p.trim());
      if (/^[A-D]\.\s/i.test(parts[0]) || /^\d+\.\s/.test(parts[0])) {
        const left = parts[0].replace(/^[A-D]\.\s*/i, "").trim(), right = parts[1]?.replace(/^\d+\.\s*/, "").trim() || "";
        const lL = parts[0].match(/^([A-D])\./i)?.[1]?.toUpperCase() || "", rL = parts[1]?.match(/^(\d+)\./)?.[1] || "";
        rows.push({ leftLabel: lL, left, rightLabel: rL, right });
      } else { h1 = parts[0] || "List I"; h2 = parts[1] || "List II"; }
    } else if (/how many|which of|select the|correctly matched/i.test(line)) qLine = line;
  }
  return { h1, h2, rows, qLine };
};

function SmartQuestionDisplay({ question }: { question: string }) {
  const fmtQ = (t: string) => t.replace(/(Consider the following statements?:?\s*)/gi,"$1\n").replace(/(Statement\s+I{1,3}:)/gi,"\n$1").replace(/(\d+\.\s)/g,"\n\n$1").replace(/(Which of the statements?|How many of the above|Which one of the following)/gi,"\n$1").replace(/\n{3,}/g,"\n\n").trim();
  if (isPipeTable(question)) {
    const { h1, h2, rows, qLine } = parsePipeTable(question);
    const lines = question.split("\n").map(l => l.trim()).filter(Boolean);
    const preamble = lines.filter(l => !l.includes("|") && !/^[A-D]\.\s/i.test(l) && !/list[\s-]?i\b/i.test(l) && !/how many|which of/i.test(l));
    return (
      <div>
        {preamble.length > 0 && <div style={{ fontSize: "0.88rem", color: G.text, lineHeight: 1.6, fontWeight: 500, marginBottom: 10 }}>{preamble.join(" ")}</div>}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10, fontSize: "0.8rem" }}>
          <thead><tr>
            <td style={{ background: `rgba(77,140,122,0.1)`, color: G.gold, padding: "7px 10px", border: `1px solid ${G.border}`, fontWeight: 700, fontSize: "0.72rem", letterSpacing: 0.8 }}>{h1}</td>
            <td style={{ background: "rgba(59,130,246,0.1)", color: G.text, padding: "7px 10px", border: "1px solid rgba(59,130,246,0.3)", fontWeight: 700, fontSize: "0.72rem", letterSpacing: 0.8 }}>{h2}</td>
          </tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i}>
              <td style={{ padding: "7px 10px", border: `1px solid ${G.border2}`, color: G.text, background: `rgba(77,140,122,0.04)`, verticalAlign: "top" }}>
                <span style={{ color: G.gold, fontWeight: 700, marginRight: 5 }}>{r.leftLabel}.</span>{r.left}
              </td>
              <td style={{ padding: "7px 10px", border: `1px solid ${G.border2}`, color: G.text, background: "rgba(59,130,246,0.04)", verticalAlign: "top" }}>
                <span style={{ color: G.text, fontWeight: 700, marginRight: 5 }}>{r.rightLabel}.</span>{r.right}
              </td>
            </tr>
          ))}</tbody>
        </table>
        {qLine && <div style={{ fontSize: "0.83rem", color: G.text, fontStyle: "italic" }}>{qLine}</div>}
      </div>
    );
  }
  return <div style={{ fontSize: "0.88rem", color: G.text, lineHeight: 1.75, fontWeight: 500, whiteSpace: "pre-wrap" }}>{fmtQ(question)}</div>;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Question { question: string; options: string[]; correct: number; explanation: string; }
interface AnswerRecord { selected: number; correct: number; }
interface HistoryItem { topic: string; exam: string; score: number; total: number; percentage: number; createdAt: string; }

type Screen = "setup" | "loading" | "playing" | "result" | "history";

interface Props { exam: string; API_URL: string; userId?: string; }

const inp = { width: "100%", padding: "12px 14px", background: "#F9F6EE", border: "1px solid #E0E0E0", borderRadius: 10, color: G.text, fontSize: "0.88rem", outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const btn = { padding: 14, borderRadius: 10, border: "none", cursor: "pointer", fontSize: "0.95rem", fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

const scoreColor = (p: number) => p >= 80 ? G.gold : p >= 50 ? G.saffron : G.error;
const grade = (p: number) => p >= 90 ? "Excellent! 🏆" : p >= 80 ? "Great! 🎉" : p >= 60 ? "Good 👍" : p >= 40 ? "Keep Practicing 📚" : "Need More Study 💪";

export default function MockTestScreen({ exam, API_URL, userId }: Props) {
  const [screen, setScreen] = useState<Screen>("setup");
  const [topic, setTopic] = useState("");
  const [selState, setSelState] = useState("");
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [showExp, setShowExp] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingH, setLoadingH] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(false);

  useEffect(() => { setSelState(""); setTopic(""); setError(""); }, [exam]);

  const startTest = async () => {
    if (cooldown) return;
    if (!topic.trim()) { setError("Please enter a topic"); return; }
    if (exam === "State PCS" && !selState) { setError("Please select your state"); return; }
    setCooldown(true);
    setTimeout(() => setCooldown(false), 20000);
    setError(""); setScreen("loading");
    try {
      const r = await fetch(`${API_URL}/quiz/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, exam, count, userId, ...(exam === "State PCS" && selState ? { state: selState } : {}) }),
      });
      const d = await r.json();
      if (!d.questions) throw new Error(d.error || "Failed to generate questions");
      setQuestions(d.questions); setAnswers([]); setCurrent(0);
      setSelected(null); setShowExp(false); setStartTime(Date.now());
      setScreen("playing");
    } catch (e: unknown) { setError((e as Error).message || "Failed to generate test."); setScreen("setup"); }
  };

  const selectAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx); setShowExp(true);
    setAnswers(a => [...a, { selected: idx, correct: questions[current].correct }]);
  };

  const nextQ = () => {
    if (current + 1 >= questions.length) finishTest();
    else { setCurrent(c => c + 1); setSelected(null); setShowExp(false); }
  };

  const finishTest = async () => {
    const timeTaken = Math.round((Date.now() - (startTime || Date.now())) / 1000);
    const fa = selected !== null
      ? [...answers.slice(0, -1), { selected, correct: questions[current].correct }]
      : answers;
    const sc = fa.filter(x => x.selected === x.correct).length;
    fetch(`${API_URL}/quiz/result`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, topic, exam, score: sc, total: questions.length, timeTaken }) }).catch(() => {});
    setAnswers(fa); setScreen("result");
  };

  const loadHistory = async () => {
    setLoadingH(true); setScreen("history");
    try { const r = await fetch(`${API_URL}/quiz/history/${userId}`); setHistory(await r.json()); } catch {}
    setLoadingH(false);
  };

  const score = answers.filter(a => a.selected === a.correct).length;
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const q = questions[current];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#F9F6EE", color: G.text, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid #E0E0E0`, flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "0.98rem", display: "flex", alignItems: "center", gap: 8 }}><span>📝</span>Mock Test</div>
        <div style={{ fontSize: "0.7rem", color: G.muted }}>{exam}{selState ? ` · ${selState.split(" ")[0]}` : ""}</div>
        <button onClick={loadHistory} style={{ background: "transparent", border: "none", color: G.muted, cursor: "pointer", fontSize: "0.75rem", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>📊 History</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px" }}>

        {/* SETUP */}
        {screen === "setup" && (
          <div style={{ maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>📝</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: G.text }}>Start Mock Test</div>
              <div style={{ fontSize: "0.8rem", color: G.muted, marginTop: 4 }}>AI-generated questions in authentic exam style</div>
            </div>

            {exam === "State PCS" && (
              <div>
                <label style={{ fontSize: "0.8rem", color: G.muted, marginBottom: 6, display: "block" }}>Select State <span style={{ color: G.error }}>*</span></label>
                <div style={{ position: "relative" }}>
                  <select value={selState} onChange={e => setSelState(e.target.value)}
                    style={{ ...inp, appearance: "none", cursor: "pointer", color: selState ? G.text : G.muted, border: `1px solid ${selState ? G.gold : "#E0E0E0"}` }}>
                    <option value="">— Choose your state —</option>
                    {STATE_PCS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <svg style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1L6 7L11 1" stroke={G.muted} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: "0.8rem", color: G.muted, marginBottom: 6, display: "block" }}>Topic</label>
              <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && startTest()}
                placeholder={TOPIC_PH[exam] || "e.g. Photosynthesis..."} style={inp} />
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: G.muted, marginBottom: 10, display: "block" }}>Number of Questions</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[5, 10, 15, 20].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: count === n ? `linear-gradient(135deg,${G.gold},${G.saffron})` : "#FFFFFF", border: `1px solid ${count === n ? G.gold : "#E0E0E0"}`, color: count === n ? "white" : G.muted, fontSize: "0.86rem", fontWeight: count === n ? 700 : 400, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: count === n ? "none" : "0 2px 6px #E0E0E0" }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && <div style={{ background: `${G.error}20`, border: `1px solid ${G.error}`, borderRadius: 8, padding: "10px 14px", color: G.error, fontSize: "0.82rem" }}>{error}</div>}

            <button onClick={startTest} disabled={cooldown}
              style={{ ...btn, background: cooldown ? "rgba(77,140,122,0.3)" : `linear-gradient(135deg,${G.gold},${G.saffron})`, color: cooldown ? "rgba(0,0,0,0.4)" : "white", width: "100%", boxShadow: cooldown ? "none" : `0 8px 24px ${G.glow}`, cursor: cooldown ? "not-allowed" : "pointer" }}>
              {cooldown ? "Please wait..." : "Start Mock Test →"}
            </button>
          </div>
        )}

        {/* LOADING */}
        {screen === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "55vh", gap: 16 }}>
            <div style={{ width: 44, height: 44, border: `3px solid #E0E0E0`, borderTopColor: G.gold, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: G.muted, fontSize: "0.88rem", textAlign: "center" }}>Generating {count} questions on &ldquo;{topic}&rdquo;...</div>
          </div>
        )}

        {/* PLAYING */}
        {screen === "playing" && q && (
          <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: "0.78rem", color: G.muted }}>Question {current + 1} of {questions.length}</span>
                <span style={{ fontSize: "0.78rem", color: G.gold, fontWeight: 600 }}>{answers.filter(a => a.selected === a.correct).length} correct</span>
              </div>
              <div style={{ height: 4, background: "#E0E0E0", borderRadius: 2 }}>
                <div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg,${G.gold},${G.saffron})`, width: `${((current + 1) / questions.length) * 100}%`, transition: "width 0.3s ease" }} />
              </div>
            </div>

            <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "16px 14px", border: `1px solid #E0E0E0`, boxShadow: "0 4px 16px #E0E0E0" }}>
              <div style={{ fontSize: "0.68rem", color: G.gold, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Question {current + 1}</div>
              <SmartQuestionDisplay question={q.question} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {q.options.map((opt, idx) => {
                const isSel = selected === idx, isCorr = idx === q.correct;
                let bg: string = "#FFFFFF", bdr: string = "#E0E0E0", col: string = G.text;
                if (selected !== null) {
                  if (isCorr) { bg = G.gold; bdr = G.gold; col = "white"; }
                  else if (isSel) { bg = G.error; bdr = G.error; col = "white"; }
                }
                return (
                  <button key={idx} onClick={() => selectAnswer(idx)}
                    style={{ padding: "12px 14px", borderRadius: 10, background: bg, border: `1px solid ${bdr}`, color: col, fontSize: "0.87rem", textAlign: "left", cursor: selected !== null ? "default" : "pointer", transition: "all 0.2s", fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: selected !== null && (isCorr || isSel) ? "white" : G.surf2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color: selected !== null && isCorr ? G.gold : selected !== null && isSel ? G.error : G.text }}>
                      {selected !== null && isCorr ? "✓" : selected !== null && isSel ? "✗" : ["A","B","C","D"][idx]}
                    </span>
                    {opt.replace(/^[A-D]\)\s*/, "")}
                  </button>
                );
              })}
            </div>

            {showExp && (
              <div style={{ background: `rgba(77,140,122,0.08)`, border: `1px solid ${G.border}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: "0.72rem", color: G.gold, fontWeight: 700, marginBottom: 5 }}>💡 Explanation</div>
                <div style={{ fontSize: "0.83rem", color: G.text, lineHeight: 1.6 }}>{q.explanation}</div>
              </div>
            )}

            {selected !== null && (
              <button onClick={nextQ} style={{ ...btn, width: "100%", background: `linear-gradient(135deg,${G.gold},${G.saffron})`, color: "white", boxShadow: `0 6px 20px ${G.glow}` }}>
                {current + 1 >= questions.length ? "See Results 🏁" : "Next Question →"}
              </button>
            )}
          </div>
        )}

        {/* RESULT */}
        {screen === "result" && (
          <div style={{ maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18, textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>{pct >= 80 ? "🏆" : pct >= 60 ? "🎉" : pct >= 40 ? "📚" : "💪"}</div>
            <div>
              <div style={{ fontSize: "2.4rem", fontWeight: 800, color: scoreColor(pct) }}>{pct}%</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: G.text, marginTop: 4 }}>{grade(pct)}</div>
              <div style={{ fontSize: "0.8rem", color: G.muted, marginTop: 5 }}>{score} out of {questions.length} correct</div>
            </div>
            <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 16, display: "flex", justifyContent: "space-around", border: `1px solid #E0E0E0`, boxShadow: "0 4px 16px #E0E0E0" }}>
              {[["Correct", score, G.gold], ["Wrong", questions.length - score, G.error], ["Total", questions.length, G.saffron]].map(([l, v, c]) => (
                <div key={String(l)}><div style={{ fontSize: "1.3rem", fontWeight: 700, color: String(c) }}>{v}</div><div style={{ fontSize: "0.7rem", color: G.muted }}>{l}</div></div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setScreen("setup"); setTopic(""); }} style={{ ...btn, flex: 1, background: "#FFFFFF", border: `1px solid #E0E0E0`, color: G.text }}>New Test</button>
              <button onClick={() => { setScreen("playing"); setCurrent(0); setSelected(null); setAnswers([]); setShowExp(false); setStartTime(Date.now()); }} style={{ ...btn, flex: 1, background: `linear-gradient(135deg,${G.gold},${G.saffron})`, color: "white" }}>Retry 🔁</button>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {screen === "history" && (
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: "0.98rem", color: G.text }}>📊 Test History</div>
              <button onClick={() => setScreen("setup")} style={{ background: "transparent", border: "none", color: G.gold, cursor: "pointer", fontSize: "0.8rem", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>+ New Test</button>
            </div>
            {loadingH ? (
              <div style={{ textAlign: "center", color: G.muted, padding: 40 }}>Loading...</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: "center", color: G.muted, padding: 40 }}>No test history yet.</div>
            ) : history.map((h, i) => (
              <div key={i} style={{ background: "#FFFFFF", borderRadius: 12, padding: "13px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, border: `1px solid #E0E0E0`, boxShadow: "0 2px 8px #E0E0E0" }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0, background: `${scoreColor(h.percentage)}18`, border: `2px solid ${scoreColor(h.percentage)}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.86rem", color: scoreColor(h.percentage) }}>{h.percentage}%</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.86rem", color: G.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.topic}</div>
                  <div style={{ fontSize: "0.7rem", color: G.muted, marginTop: 2 }}>
                    {h.score}/{h.total} correct · {h.exam} · {new Date(h.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
