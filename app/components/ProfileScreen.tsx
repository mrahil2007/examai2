"use client";

import { useCallback, useEffect, useState } from "react";

const G = {
  bg: "#F9F6EE",
  card: "#FFFFFF",
  border: "#E0E0E0",
  text: "#0f172a",
  muted: "#64748b",
  soft: "#475569",
  teal: "#00674f",
  tealSoft: "rgba(0,103,79,0.08)",
  tealBorder: "rgba(0,103,79,0.18)",
  amber: "#b45309",
  red: "#dc2626",
  redSoft: "rgba(220,38,38,0.08)",
};

interface UserLocal {
  uid: string;
  name: string;
  email: string;
  exam: string;
}

interface Props {
  API_URL: string;
  user: UserLocal;
  exam: string;
  exams: string[];
  onExamChange: (exam: string) => void;
  onLogout: () => void;
}

interface UserSnapshot {
  userName?: string;
  coins?: number;
  streak?: number;
  xp?: number;
  createdAt?: string;
  lastPlayedDate?: string | null;
}

interface NotificationPrefs {
  enabled: boolean;
  current_affairs_morning: boolean;
  current_affairs_evening: boolean;
  quiz_nudge: boolean;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  coins: number;
  streak: number;
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  current_affairs_morning: true,
  current_affairs_evening: true,
  quiz_nudge: true,
};

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(user: UserLocal) {
  const source = (user.name || user.email || "User").trim();
  const words = source.split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2);
  return initials.toUpperCase();
}

export default function ProfileScreen({
  API_URL,
  user,
  exam,
  exams,
  onExamChange,
  onLogout,
}: Props) {
  const baseURL = API_URL?.replace(/\/$/, "") || "";

  const [profile, setProfile] = useState<UserSnapshot | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<keyof NotificationPrefs | "exam" | null>(null);

  const loadProfile = useCallback(async () => {
    if (!baseURL || !user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      const [userRes, prefsRes, leaderboardRes] = await Promise.allSettled([
        fetch(`${baseURL}/user/${encodeURIComponent(user.uid)}`),
        fetch(`${baseURL}/user/${encodeURIComponent(user.uid)}/notification-prefs`),
        fetch(`${baseURL}/leaderboard?userId=${encodeURIComponent(user.uid)}`),
      ]);

      if (userRes.status === "fulfilled" && userRes.value.ok) {
        const data = await userRes.value.json().catch(() => ({}));
        setProfile(data);
      } else {
        setProfile(null);
      }

      if (prefsRes.status === "fulfilled" && prefsRes.value.ok) {
        const data = await prefsRes.value.json().catch(() => DEFAULT_PREFS);
        setPrefs({ ...DEFAULT_PREFS, ...data });
      } else {
        setPrefs(DEFAULT_PREFS);
      }

      if (leaderboardRes.status === "fulfilled" && leaderboardRes.value.ok) {
        const data = await leaderboardRes.value.json().catch(() => ({}));
        setLeaders(Array.isArray(data?.leaderboard) ? data.leaderboard.slice(0, 5) : []);
        setUserRank(typeof data?.userRank === "number" ? data.userRank : null);
      } else {
        setLeaders([]);
        setUserRank(null);
      }
    } catch (err) {
      console.error("[Profile] Load failed:", err);
      setError("Could not load profile details right now.");
    } finally {
      setLoading(false);
    }
  }, [baseURL, user?.uid]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updatePreference = async (
    key: keyof NotificationPrefs,
    value: boolean
  ) => {
    if (!baseURL || !user?.uid) return;

    const previous = prefs[key];
    setSavingKey(key);
    setPrefs((prev) => ({ ...prev, [key]: value }));

    try {
      const res = await fetch(
        `${baseURL}/user/${encodeURIComponent(user.uid)}/notification-prefs`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Could not update preference.");
      }
    } catch (err) {
      console.error("[Profile] Pref update failed:", err);
      setPrefs((prev) => ({ ...prev, [key]: previous }));
      setError("Could not update notification settings.");
    } finally {
      setSavingKey(null);
    }
  };

  const changeExam = async (nextExam: string) => {
    setSavingKey("exam");
    onExamChange(nextExam);
    setSavingKey(null);
  };

  const statCards = [
    { label: "Coins", value: profile?.coins ?? 0, tone: G.teal },
    { label: "Streak", value: profile?.streak ?? 0, tone: G.amber },
    { label: "XP", value: profile?.xp ?? 0, tone: G.text },
    { label: "Rank", value: userRank ?? "—", tone: "#2563eb" },
  ];

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px",
        background: G.bg,
      }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div
          style={{
            background: G.card,
            border: `1px solid ${G.border}`,
            borderRadius: 26,
            padding: "24px 22px",
            boxShadow: "0 12px 36px rgba(15,23,42,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                background: "linear-gradient(135deg, #00674f, #008a6a)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.35rem",
                fontWeight: 900,
                letterSpacing: ".04em",
              }}
            >
              {getInitials(user)}
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: "0.78rem", color: G.teal, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
                Profile
              </div>
              <h1 style={{ margin: 0, fontSize: "1.5rem", color: G.text, lineHeight: 1.2 }}>
                {profile?.userName || user.name || "ExamAI Student"}
              </h1>
              <p style={{ margin: "8px 0 0", color: G.soft, lineHeight: 1.6 }}>
                {user.email || "No email available"}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginTop: 20,
            }}
          >
            {statCards.map((item) => (
              <div
                key={item.label}
                style={{
                  background: "#fff",
                  border: `1px solid ${G.border}`,
                  borderRadius: 18,
                  padding: "16px 14px",
                }}
              >
                <div style={{ fontSize: "0.78rem", color: G.muted, fontWeight: 700, marginBottom: 8 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: "1.4rem", color: item.tone, fontWeight: 900 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div
            style={{
              border: `1px solid rgba(220,38,38,0.18)`,
              background: G.redSoft,
              color: G.red,
              borderRadius: 16,
              padding: "14px 16px",
              fontSize: "0.9rem",
              lineHeight: 1.6,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          <div
            style={{
              background: G.card,
              border: `1px solid ${G.border}`,
              borderRadius: 24,
              padding: "20px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.12rem", color: G.text }}>Study preferences</h2>
            <p style={{ margin: "6px 0 18px", color: G.muted, fontSize: "0.88rem", lineHeight: 1.6 }}>
              Keep your target exam and notification settings up to date.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  border: `1px solid ${G.border}`,
                  borderRadius: 18,
                  padding: "15px 16px",
                  background: "#fff",
                }}
              >
                <div style={{ fontSize: "0.76rem", color: G.muted, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
                  Current exam
                </div>
                <select
                  value={exam}
                  onChange={(e) => void changeExam(e.target.value)}
                  style={{
                    width: "100%",
                    border: `1px solid ${G.border}`,
                    borderRadius: 12,
                    padding: "12px 13px",
                    fontSize: "0.92rem",
                    outline: "none",
                    background: "#fff",
                    color: G.text,
                  }}
                >
                  {exams.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 8, fontSize: "0.76rem", color: G.muted }}>
                  {savingKey === "exam"
                    ? "Saving exam preference..."
                    : "This exam is used across quizzes, AI help, and flashcards on this device."}
                </div>
              </div>

              {[
                {
                  key: "enabled" as const,
                  label: "All notifications",
                  desc: "Master switch for alerts from ExamAI.",
                },
                {
                  key: "current_affairs_morning" as const,
                  label: "Morning current affairs",
                  desc: "Receive your morning current affairs update.",
                },
                {
                  key: "current_affairs_evening" as const,
                  label: "Evening current affairs",
                  desc: "Receive your evening revision reminder.",
                },
                {
                  key: "quiz_nudge" as const,
                  label: "Quiz reminders",
                  desc: "Get nudges to maintain your quiz streak.",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 12,
                    alignItems: "center",
                    border: `1px solid ${G.border}`,
                    borderRadius: 18,
                    padding: "15px 16px",
                    background: "#fff",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 800, color: G.text }}>
                      {item.label}
                    </div>
                    <div style={{ marginTop: 4, fontSize: "0.82rem", color: G.muted, lineHeight: 1.55 }}>
                      {item.desc}
                    </div>
                  </div>
                  <button
                    onClick={() => void updatePreference(item.key, !prefs[item.key])}
                    disabled={savingKey === item.key}
                    style={{
                      minWidth: 88,
                      border: "none",
                      borderRadius: 999,
                      padding: "10px 12px",
                      background: prefs[item.key] ? G.teal : "#e5e7eb",
                      color: prefs[item.key] ? "#fff" : G.muted,
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      opacity: savingKey === item.key ? 0.7 : 1,
                    }}
                  >
                    {savingKey === item.key ? "Saving" : prefs[item.key] ? "On" : "Off"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div
              style={{
                background: G.card,
                border: `1px solid ${G.border}`,
                borderRadius: 24,
                padding: "20px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.12rem", color: G.text }}>Account snapshot</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                {[
                  { label: "Member since", value: formatDate(profile?.createdAt) },
                  { label: "Last quiz day", value: formatDate(profile?.lastPlayedDate) },
                  { label: "Current rank", value: userRank ? `#${userRank}` : "Not ranked yet" },
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      border: `1px solid ${G.border}`,
                      borderRadius: 16,
                      padding: "13px 14px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontSize: "0.72rem", color: G.muted, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5 }}>
                      {row.label}
                    </div>
                    <div style={{ fontSize: "0.94rem", fontWeight: 700, color: G.text }}>
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: G.card,
                border: `1px solid ${G.border}`,
                borderRadius: 24,
                padding: "20px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.12rem", color: G.text }}>Leaderboard</h2>
              <p style={{ margin: "6px 0 14px", color: G.muted, fontSize: "0.86rem", lineHeight: 1.6 }}>
                Top learners by coins earned.
              </p>

              {loading ? (
                <div style={{ color: G.muted, fontSize: "0.9rem" }}>Loading leaderboard...</div>
              ) : leaders.length === 0 ? (
                <div style={{ color: G.muted, fontSize: "0.9rem", lineHeight: 1.6 }}>
                  Leaderboard data will appear here after students start earning coins.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {leaders.map((entry, index) => (
                    <div
                      key={`${entry.userId}-${index}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "28px 1fr auto",
                        gap: 10,
                        alignItems: "center",
                        border: `1px solid ${G.border}`,
                        borderRadius: 14,
                        padding: "11px 12px",
                        background:
                          entry.userId === user.uid ? G.tealSoft : "#fff",
                      }}
                    >
                      <div style={{ fontSize: "0.82rem", fontWeight: 800, color: G.muted }}>
                        #{index + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: G.text }}>
                          {entry.userName}
                        </div>
                        <div style={{ fontSize: "0.76rem", color: G.muted }}>
                          {entry.streak} day streak
                        </div>
                      </div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 900, color: G.teal }}>
                        {entry.coins}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                background: G.card,
                border: `1px solid ${G.border}`,
                borderRadius: 24,
                padding: "20px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.12rem", color: G.text }}>Actions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
                <button
                  onClick={onLogout}
                  style={{
                    border: "none",
                    background: G.teal,
                    color: "#fff",
                    borderRadius: 14,
                    padding: "13px 16px",
                    fontSize: "0.92rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Sign Out
                </button>
                <a
                  href="/delete-account"
                  style={{
                    textAlign: "center",
                    textDecoration: "none",
                    border: `1px solid rgba(220,38,38,0.18)`,
                    background: G.redSoft,
                    color: G.red,
                    borderRadius: 14,
                    padding: "13px 16px",
                    fontSize: "0.9rem",
                    fontWeight: 800,
                  }}
                >
                  Delete Account
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
