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
  amberSoft: "rgba(180,83,9,0.08)",
  red: "#dc2626",
  redSoft: "rgba(220,38,38,0.08)",
};

type CardState = "NEW" | "LEARNING" | "KNOWN" | "FORGOTTEN";

interface Props {
  API_URL: string;
  userId: string;
  exam: string;
}

interface FlashcardStats {
  states: Record<CardState, number>;
  dueToday: number;
  totalDecks: number;
  totalCards: number;
}

interface DeckSummary {
  topic: string;
  totalCards: number;
  knownCount: number;
  learningCount: number;
  newCount: number;
  forgottenCount: number;
  dueCount: number;
  lastReviewedAt: string | null;
}

interface Flashcard {
  id: string;
  q: string;
  a: string;
  topic: string;
  state: CardState;
  correctStreak: number;
}

const EMPTY_STATS: FlashcardStats = {
  states: {
    NEW: 0,
    LEARNING: 0,
    KNOWN: 0,
    FORGOTTEN: 0,
  },
  dueToday: 0,
  totalDecks: 0,
  totalCards: 0,
};

function formatDate(value?: string | null) {
  if (!value) return "Never reviewed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never reviewed";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStateColor(state: CardState) {
  if (state === "KNOWN") return { fg: G.teal, bg: G.tealSoft };
  if (state === "LEARNING") return { fg: "#2563eb", bg: "rgba(37,99,235,0.08)" };
  if (state === "FORGOTTEN") return { fg: G.red, bg: G.redSoft };
  return { fg: G.amber, bg: G.amberSoft };
}

export default function FlashcardsScreen({ API_URL, userId, exam }: Props) {
  const baseURL = API_URL?.replace(/\/$/, "") || "";

  const [stats, setStats] = useState<FlashcardStats>(EMPTY_STATS);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [reviewTopic, setReviewTopic] = useState("");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!baseURL || !userId) return;

    setLoading(true);
    setError(null);

    try {
      const [statsRes, decksRes] = await Promise.all([
        fetch(`${baseURL}/flashcards/${encodeURIComponent(userId)}/stats`),
        fetch(`${baseURL}/flashcards/${encodeURIComponent(userId)}`),
      ]);

      const statsJson = await statsRes.json().catch(() => ({}));
      const decksJson = await decksRes.json().catch(() => ({}));

      if (!statsRes.ok) {
        throw new Error(statsJson?.error || "Could not load flashcard stats.");
      }
      if (!decksRes.ok) {
        throw new Error(decksJson?.error || "Could not load flashcard decks.");
      }

      setStats({
        ...EMPTY_STATS,
        ...statsJson,
        states: {
          ...EMPTY_STATS.states,
          ...(statsJson?.states || {}),
        },
      });
      setDecks(Array.isArray(decksJson?.decks) ? decksJson.decks : []);
    } catch (err) {
      console.error("[Flashcards] Dashboard load failed:", err);
      setError("Could not load your flashcards. Please try again.");
      setStats(EMPTY_STATS);
      setDecks([]);
    } finally {
      setLoading(false);
    }
  }, [baseURL, userId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const startReview = useCallback(
    async (deckTopic: string, providedCards?: Flashcard[]) => {
      if (providedCards?.length) {
        setCards(providedCards);
        setReviewTopic(deckTopic);
        setReviewIndex(0);
        setShowAnswer(false);
        setSessionDone(false);
        return;
      }

      if (!baseURL || !userId) return;

      setError(null);
      setReviewing(true);

      try {
        const res = await fetch(
          `${baseURL}/flashcards/${encodeURIComponent(userId)}/topic/${encodeURIComponent(deckTopic)}`
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Could not load deck.");
        }

        const nextCards = Array.isArray(data?.cards) ? data.cards : [];
        setCards(nextCards);
        setReviewTopic(deckTopic);
        setReviewIndex(0);
        setShowAnswer(false);
        setSessionDone(false);
      } catch (err) {
        console.error("[Flashcards] Review load failed:", err);
        setError("Could not open this deck right now.");
      } finally {
        setReviewing(false);
      }
    },
    [baseURL, userId]
  );

  const generateDeck = async () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      setError("Enter a topic to generate flashcards.");
      return;
    }

    if (!baseURL || !userId) return;

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`${baseURL}/flashcards/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          topic: trimmedTopic,
          count,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Could not generate flashcards.");
      }

      const nextCards = Array.isArray(data?.cards) ? data.cards : [];
      setTopic("");
      await loadDashboard();
      if (nextCards.length) {
        void startReview(trimmedTopic, nextCards);
      }
    } catch (err) {
      console.error("[Flashcards] Generate failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Flashcard generation failed. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  const exitReview = async () => {
    setCards([]);
    setReviewTopic("");
    setReviewIndex(0);
    setShowAnswer(false);
    setSessionDone(false);
    await loadDashboard();
  };

  const submitReview = async (knewIt: boolean) => {
    const currentCard = cards[reviewIndex];
    if (!currentCard || reviewing) return;

    setReviewing(true);
    setError(null);

    try {
      const res = await fetch(`${baseURL}/flashcards/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: currentCard.id,
          userId,
          knewIt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Could not save review.");
      }

      setCards((prev) =>
        prev.map((card, index) =>
          index === reviewIndex
            ? {
                ...card,
                state: data?.state || card.state,
                correctStreak:
                  typeof data?.correctStreak === "number"
                    ? data.correctStreak
                    : card.correctStreak,
              }
            : card
        )
      );

      const isLastCard = reviewIndex >= cards.length - 1;
      if (isLastCard) {
        setSessionDone(true);
        await loadDashboard();
      } else {
        setReviewIndex((prev) => prev + 1);
        setShowAnswer(false);
      }
    } catch (err) {
      console.error("[Flashcards] Review submit failed:", err);
      setError("Could not save your review. Please try again.");
    } finally {
      setReviewing(false);
    }
  };

  const currentCard = cards[reviewIndex];
  const suggestions = [
    `${exam} basics`,
    `${exam} current affairs`,
    `${exam} high-yield revision`,
  ];

  if (currentCard) {
    const stateStyle = getStateColor(currentCard.state);

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
            maxWidth: 760,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => {
                void exitReview();
              }}
              style={{
                border: `1px solid ${G.border}`,
                background: G.card,
                color: G.text,
                borderRadius: 12,
                padding: "10px 14px",
                fontSize: "0.86rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ← Back to decks
            </button>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 999,
                background: stateStyle.bg,
                color: stateStyle.fg,
                fontSize: "0.76rem",
                fontWeight: 800,
              }}
            >
              {currentCard.state} • Card {reviewIndex + 1} / {cards.length}
            </span>
          </div>

          <div
            style={{
              background: G.card,
              border: `1px solid ${G.border}`,
              borderRadius: 24,
              padding: "24px 22px",
              boxShadow: "0 12px 36px rgba(15,23,42,0.05)",
            }}
          >
            <div style={{ fontSize: "0.78rem", color: G.muted, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>
              {reviewTopic}
            </div>
            <h2 style={{ margin: 0, fontSize: "1.35rem", lineHeight: 1.45, color: G.text }}>
              {currentCard.q}
            </h2>

            <div
              style={{
                marginTop: 18,
                padding: "18px 16px",
                borderRadius: 18,
                background: showAnswer ? G.tealSoft : "#f8fafc",
                border: `1px solid ${showAnswer ? G.tealBorder : G.border}`,
                minHeight: 110,
                display: "flex",
                alignItems: "center",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  lineHeight: 1.75,
                  color: showAnswer ? G.text : G.muted,
                }}
              >
                {showAnswer ? currentCard.a : "Tap Show Answer when you are ready to self-check."}
              </p>
            </div>

            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                style={{
                  marginTop: 18,
                  width: "100%",
                  border: "none",
                  background: G.teal,
                  color: "#fff",
                  borderRadius: 14,
                  padding: "14px 16px",
                  fontSize: "0.94rem",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Show Answer
              </button>
            ) : (
              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <button
                  onClick={() => void submitReview(false)}
                  disabled={reviewing}
                  style={{
                    border: `1px solid rgba(220,38,38,0.18)`,
                    background: G.redSoft,
                    color: G.red,
                    borderRadius: 14,
                    padding: "14px 16px",
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    opacity: reviewing ? 0.7 : 1,
                  }}
                >
                  Need Review
                </button>
                <button
                  onClick={() => void submitReview(true)}
                  disabled={reviewing}
                  style={{
                    border: "none",
                    background: G.teal,
                    color: "#fff",
                    borderRadius: 14,
                    padding: "14px 16px",
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    opacity: reviewing ? 0.7 : 1,
                  }}
                >
                  {reviewing ? "Saving..." : "Knew It"}
                </button>
              </div>
            )}
          </div>

          {sessionDone && (
            <div
              style={{
                background: G.card,
                border: `1px solid ${G.border}`,
                borderRadius: 20,
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: "1rem", fontWeight: 800, color: G.text, marginBottom: 6 }}>
                Review session complete
              </div>
              <p style={{ margin: 0, color: G.soft, lineHeight: 1.7 }}>
                Nice work. Your deck stats have been updated, and the next due dates are now scheduled automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

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
            borderRadius: 24,
            padding: "22px 20px",
            boxShadow: "0 12px 36px rgba(15,23,42,0.05)",
          }}
        >
          <div style={{ fontSize: "0.78rem", color: G.teal, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
            Flashcards
          </div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", lineHeight: 1.2, color: G.text }}>
            Build revision decks for {exam}
          </h1>
          <p style={{ margin: "10px 0 0", color: G.soft, lineHeight: 1.7 }}>
            Generate short recall cards, review them with spaced repetition, and keep your weak areas in one place.
          </p>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={`Try “${exam} polity”, “photosynthesis”, or “Indian economy”`}
              style={{
                width: "100%",
                border: `1px solid ${G.border}`,
                background: "#fff",
                color: G.text,
                borderRadius: 14,
                padding: "13px 14px",
                fontSize: "0.92rem",
                outline: "none",
                flex: "1 1 260px",
              }}
            />
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              style={{
                border: `1px solid ${G.border}`,
                background: "#fff",
                color: G.text,
                borderRadius: 14,
                padding: "13px 12px",
                fontSize: "0.92rem",
                outline: "none",
                flex: "0 0 130px",
              }}
            >
              {[5, 10, 15, 20].map((value) => (
                <option key={value} value={value}>
                  {value} cards
                </option>
              ))}
            </select>
            <button
              onClick={() => void generateDeck()}
              disabled={generating}
              style={{
                border: "none",
                background: G.teal,
                color: "#fff",
                borderRadius: 14,
                padding: "13px 16px",
                fontSize: "0.92rem",
                fontWeight: 800,
                cursor: "pointer",
                opacity: generating ? 0.75 : 1,
                flex: "0 0 140px",
              }}
            >
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {suggestions.map((item) => (
              <button
                key={item}
                onClick={() => setTopic(item)}
                style={{
                  border: `1px solid ${G.border}`,
                  background: "#fff",
                  color: G.muted,
                  borderRadius: 999,
                  padding: "7px 12px",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {item}
              </button>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          {[
            { label: "Due Today", value: stats.dueToday, tone: G.teal },
            { label: "Total Cards", value: stats.totalCards, tone: G.text },
            { label: "Known", value: stats.states.KNOWN, tone: G.teal },
            { label: "Learning", value: stats.states.LEARNING + stats.states.NEW, tone: "#2563eb" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: G.card,
                border: `1px solid ${G.border}`,
                borderRadius: 20,
                padding: "18px 16px",
              }}
            >
              <div style={{ fontSize: "0.78rem", color: G.muted, fontWeight: 700, marginBottom: 8 }}>
                {item.label}
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: item.tone }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: G.card,
            border: `1px solid ${G.border}`,
            borderRadius: 24,
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", color: G.text }}>Your decks</h2>
              <p style={{ margin: "6px 0 0", color: G.muted, fontSize: "0.88rem" }}>
                {stats.totalDecks} topics saved for revision
              </p>
            </div>
            <button
              onClick={() => void loadDashboard()}
              style={{
                border: `1px solid ${G.border}`,
                background: "#fff",
                color: G.text,
                borderRadius: 12,
                padding: "9px 12px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ color: G.muted, padding: "18px 0", fontSize: "0.92rem" }}>
              Loading decks...
            </div>
          ) : decks.length === 0 ? (
            <div
              style={{
                border: `1px dashed ${G.border}`,
                borderRadius: 18,
                padding: "22px 18px",
                textAlign: "center",
                color: G.muted,
                lineHeight: 1.7,
              }}
            >
              No flashcards yet. Generate your first deck to start spaced revision.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {decks.map((deck) => (
                <button
                  key={deck.topic}
                  onClick={() => void startReview(deck.topic)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: `1px solid ${G.border}`,
                    background: "#fff",
                    borderRadius: 18,
                    padding: "16px 16px 15px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "1rem", fontWeight: 800, color: G.text }}>
                        {deck.topic}
                      </div>
                      <div style={{ fontSize: "0.82rem", color: G.muted, marginTop: 5 }}>
                        Last reviewed: {formatDate(deck.lastReviewedAt)}
                      </div>
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 10px",
                        borderRadius: 999,
                        background: deck.dueCount > 0 ? G.tealSoft : "#f8fafc",
                        color: deck.dueCount > 0 ? G.teal : G.muted,
                        fontSize: "0.78rem",
                        fontWeight: 800,
                      }}
                    >
                      {deck.dueCount} due
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 12,
                    }}
                  >
                    {[
                      `Cards ${deck.totalCards}`,
                      `Known ${deck.knownCount}`,
                      `Learning ${deck.learningCount + deck.newCount}`,
                      `Forgotten ${deck.forgottenCount}`,
                    ].map((label) => (
                      <span
                        key={label}
                        style={{
                          padding: "5px 9px",
                          borderRadius: 999,
                          background: "#f8fafc",
                          color: G.soft,
                          fontSize: "0.74rem",
                          fontWeight: 700,
                        }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
