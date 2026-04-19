"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import Link from "next/link";
import { G } from "@/lib/theme";

// ── Helpers ───────────────────────────────────────────────────────────────────
function typeText(text: string, setMessages: React.Dispatch<React.SetStateAction<Message[]>>, onDone?: () => void) {
  if (!text || typeof text !== "string") { onDone?.(); return; }
  const words = text.split(" ");
  let index = 0;
  const interval = setInterval(() => {
    setMessages(prev => {
      const updated = [...prev];
      const last = updated.length - 1;
      if (last < 0 || updated[last].role !== "assistant") { clearInterval(interval); onDone?.(); return prev; }
      updated[last] = { ...updated[last], content: words.slice(0, index + 1).join(" ") };
      return updated;
    });
    index++;
    if (index >= words.length) { clearInterval(interval); onDone?.(); }
  }, 55);
}

const isImageVerb = (t = "") => { const s = t.toLowerCase().replace(/[^a-z]/g,""); if (!s) return false; if (["generate","create","draw","make","imagine"].includes(s)) return true; return /^gen[a-z]{0,8}rate$/.test(s); };

const extractImagePrompt = (text = "") => {
  const v = text.trim(); if (!v) return null;
  const s = v.match(/^\/(?:image|img|imagine)\s+(.+)$/i); if (s?.[1]?.trim()) return s[1].trim();
  const c = v.match(/^(?:please\s+)?(?:(?:create|generate|draw|make|imagine)\s+)+(?:an?\s+)?image(?:\s+(?:of|for))?\s*[:,-]?\s*(.+)$/i); if (c?.[1]?.trim()) return c[1].trim();
  const p = v.match(/^(?:can|could|would)\s+you\s+(?:(?:create|generate|draw|make|imagine)\s+)+(?:an?\s+)?image(?:\s+(?:of|for))?\s*[:,-]?\s*(.+)$/i); if (p?.[1]?.trim()) return p[1].trim();
  const m = v.match(/\bimage\b\s*(?:of|for)?\s*[:,-]?\s*(.+)$/i);
  if (m?.[1]?.trim()) { const before = v.slice(0, m.index || 0).trim(); if (before.split(/\s+/).filter(Boolean).some(isImageVerb)) return m[1].trim(); }
  return null;
};

const isImageEditIntent = (text = "") => { const v = text.trim().toLowerCase(); if (!v || /\?$/.test(v) || /^(what|which|who|where|when|why|how)\b/.test(v)) return false; return /\b(edit|change|modify|make|turn|replace|remove|add|swap|recolor|color|colour|background|retouch|enhance|transform|convert)\b/.test(v); };

const resolvePollinationsUrl = async (prompt: string, apiUrl: string) => {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 60000);
    const res = await fetch(`${apiUrl}/image/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }), signal: controller.signal });
    clearTimeout(t);
    const data = await res.json().catch(() => null);
    if (!res.ok) return { url: null };
    return { url: typeof data?.imageUrl === "string" && data.imageUrl.trim() ? data.imageUrl.trim() : null };
  } catch { return { url: null }; }
};

const markdownUrlTransform = (url: string) => {
  if (typeof url !== "string") return "";
  const v = url.trim(); if (!v) return "";
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(v) || /^(https?:|mailto:|tel:)/i.test(v)) return v;
  return "";
};

const MAX_UPLOAD_BYTES = 900 * 1024;
const MAX_UPLOAD_TEXT = "900KB";
const MAX_IMAGE_DIMENSION = 1600;

const toJpgName = (filename: string) => {
  const clean = filename.trim() || "upload";
  const dot = clean.lastIndexOf(".");
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  return `${stem}.jpg`;
};

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    img.src = objectUrl;
  });

const optimizeImageForUpload = async (file: File): Promise<File> => {
  if (!file.type.startsWith("image/") || file.size <= MAX_UPLOAD_BYTES) {
    return file;
  }

  const img = await loadImage(file);
  let width = img.naturalWidth || img.width || 1;
  let height = img.naturalHeight || img.height || 1;
  const maxSide = Math.max(width, height);

  if (maxSide > MAX_IMAGE_DIMENSION) {
    const ratio = MAX_IMAGE_DIMENSION / maxSide;
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  let bestBlob: Blob | null = null;

  for (let downscale = 0; downscale < 5; downscale++) {
    const scale = Math.pow(0.86, downscale);
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available");
    ctx.drawImage(img, 0, 0, targetW, targetH);

    for (const quality of [0.82, 0.74, 0.66, 0.58, 0.5]) {
      const blob = await canvasToBlob(canvas, quality);
      if (!blob) continue;
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;

      if (blob.size <= MAX_UPLOAD_BYTES) {
        return new File([blob], toJpgName(file.name), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }
  }

  if (bestBlob) {
    return new File([bestBlob], toJpgName(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  }

  throw new Error("Could not compress image");
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message { role: "user" | "assistant"; content: string; imageUrl?: string; imagePrompt?: string; filePrompt?: string; }
interface Chat { _id: string; title?: string; updatedAt: string; exam?: string; }

// ── ImageComponent ─────────────────────────────────────────────────────────────
function ImageComponent({ src, alt, onRegenerate, onZoom }: { src?: string; alt?: string; onRegenerate?: (p: string) => void; onZoom?: (s: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const active = typeof src === "string" ? src.trim() : "";

  useEffect(() => { setLoading(true); setErr(false); }, [src]);
  useEffect(() => {
    const el = imgRef.current; if (!el) return;
    if (el.complete && el.naturalWidth > 0) { setLoading(false); return; }
    if (!loading || err) return;
    const t = setTimeout(() => { const c = imgRef.current; if (c && c.complete && c.naturalWidth > 0) setLoading(false); else { setLoading(false); setErr(true); } }, 45000);
    return () => clearTimeout(t);
  }, [loading, err, active]);

  const download = async () => {
    try { const r = await fetch(active); const b = await r.blob(); const u = URL.createObjectURL(b); const l = document.createElement("a"); l.href = u; l.download = `examai-${Date.now()}.png`; document.body.appendChild(l); l.click(); document.body.removeChild(l); URL.revokeObjectURL(u); }
    catch { window.open(active, "_blank"); }
  };

  return (
    <div style={{ margin: "10px 0", maxWidth: 340 }}>
      <div style={{ position: "relative", minHeight: err ? 80 : 180, background: "#FFFFFF", borderRadius: 12, overflow: "hidden", border: "1px solid #E0E0E0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {loading && !err && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 28, height: 28, border: "3px solid #e2e8f0", borderTopColor: G.gold, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}
        <img ref={imgRef} src={active} alt={alt} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setErr(true); }} onClick={() => onZoom?.(active)}
          style={{ maxWidth: "100%", maxHeight: 320, display: loading ? "none" : "block", borderRadius: 12, objectFit: "contain", cursor: onZoom ? "zoom-in" : "default" }} />
        {err && <div style={{ color: G.error, fontSize: "0.85rem", padding: "0 12px" }}>⚠️ Failed to load image</div>}
      </div>
      {!loading && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {[
            { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>, fn: download },
            { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>, fn: () => onRegenerate?.(alt || "") },
        ].map(({ icon, fn }, i) => (
          <button key={i} onClick={fn} style={{ width: 34, height: 34, borderRadius: 8, background: "#FFFFFF", border: "1px solid #E0E0E0", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px #E0E0E0" }}>{icon}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
interface Props {
  exam: string;
  onChangeExam?: (e: string) => void;
  API_URL: string;
  userId?: string;
  anonId?: string;
  initialPrompt?: string;
  onPromptUsed?: () => void;
}

export default function AskAIScreen({ exam, API_URL, userId, anonId, initialPrompt, onPromptUsed }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePrompt, setFilePrompt] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const msgEndRef = useRef<HTMLDivElement>(null);
  const messagesWrapRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const msgsRef = useRef(messages);
  const chatIdRef = useRef(currentChatId);

  const apiBase = useMemo(() => {
    const raw = typeof API_URL === "string" ? API_URL.trim() : "";
    return raw.replace(/\/+$/, "");
  }, [API_URL]);

  const buildApiUrl = useCallback((path: string) => {
    if (!apiBase) return path;
    return `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;
  }, [apiBase]);

  const encodedUserId = useMemo(() => {
    const raw = (userId || anonId || "").trim();
    return raw ? encodeURIComponent(raw) : "";
  }, [userId, anonId]);

  const updateScrollState = useCallback(() => {
    const el = messagesWrapRef.current;
    if (!el) return;
    const gapFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(gapFromBottom > 90);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = messagesWrapRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setShowScrollDown(false);
  }, []);

  useEffect(() => { msgsRef.current = messages; }, [messages]);
  useEffect(() => { chatIdRef.current = currentChatId; }, [currentChatId]);
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
    requestAnimationFrame(updateScrollState);
  }, [messages, loading, updateScrollState]);
  useEffect(() => { if (taRef.current) { taRef.current.style.height = "auto"; taRef.current.style.height = Math.min(taRef.current.scrollHeight, 160) + "px"; } }, [input]);
  useEffect(() => { loadChatList(); }, [exam, encodedUserId, buildApiUrl]);
  useEffect(() => { if (!initialPrompt) return; setInput(initialPrompt); onPromptUsed?.(); const t = setTimeout(() => sendMessageWithText(initialPrompt), 400); return () => clearTimeout(t); }, [initialPrompt]);
  useEffect(() => {
    setCurrentChatId(null);
    setMessages([]);
    setInput("");
    chatIdRef.current = null;
  }, [exam]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const loadChatList = async () => {
    setLoadingChats(true);
    if (!encodedUserId) {
      setChatList([]);
      setLoadingChats(false);
      return;
    }
    try {
      const r = await fetch(buildApiUrl(`/chats/${encodedUserId}`));
      const data = await r.json();
      const allChats = Array.isArray(data) ? data : Array.isArray(data?.chats) ? data.chats : [];
      setChatList(allChats.filter((chat: Chat) => !chat?.exam || String(chat.exam).trim() === String(exam).trim()));
    } catch { setChatList([]); }
    setLoadingChats(false);
  };

  const createNewChat = async (ex = exam) => {
    if (!encodedUserId) return null;
    try {
      const r = await fetch(buildApiUrl(`/chats/${encodedUserId}`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exam: ex }) });
      const d = await r.json();
      const id = d._id || d.chatId;
      setCurrentChatId(id); setMessages([]); setInput(""); setShowSidebar(false);
      await loadChatList();
      return id;
    } catch { return null; }
  };

  const loadChat = async (id: string) => {
    if (!encodedUserId) return;
    try {
      const r = await fetch(buildApiUrl(`/chats/${encodedUserId}/${id}`));
      const d = await r.json();
      setCurrentChatId(id); setMessages(d.messages || []); setShowSidebar(false);
    } catch { showToast("⚠️ Failed to load chat."); }
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!encodedUserId) return;
    try {
      await fetch(buildApiUrl(`/chats/${encodedUserId}/${id}`), { method: "DELETE" });
      if (currentChatId === id) { setCurrentChatId(null); setMessages([]); }
      await loadChatList();
    } catch {}
  };

  const buildHistory = (msgs: Message[]) => msgs.filter(m => m.content?.trim()).slice(-10).map(m => ({ role: m.role, content: m.content }));

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput(""); setLoading(true);
    let cid = chatIdRef.current;
    if (!cid) { cid = await createNewChat(exam); if (!cid) { setLoading(false); return; } }
    const prev = msgsRef.current;
    setMessages(p => [...p, { role: "user", content: text }, { role: "assistant", content: "" }]);
    const imgPrompt = extractImagePrompt(text);
    if (imgPrompt) {
      const result = await resolvePollinationsUrl(imgPrompt, apiBase);
      setMessages(p => { const u = [...p]; u[u.length - 1] = result?.url ? { ...u[u.length - 1], content: `🖼️ ${imgPrompt}`, imageUrl: result.url, imagePrompt: imgPrompt } : { ...u[u.length - 1], content: "⚠️ Could not generate image." }; return u; });
      setLoading(false); return;
    }
    const hist = buildHistory([...prev, { role: "user", content: text }]);
    try {
      const r = await fetch(buildApiUrl("/chat"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, exam, history: hist, userId, anonId, chatId: cid }) });
      const d = await r.json();
      const ans = typeof d?.answer === "string" && d.answer.trim() ? d.answer.trim() : "⚠️ No response. Please try again.";
      typeText(ans, setMessages, () => { setLoading(false); loadChatList(); });
    } catch {
      setMessages(p => [...p.slice(0,-1), { role: "assistant", content: "⚠️ Server error. Please try again." }]);
      setLoading(false);
    }
  };

  const sendMessage = () => { if (!input.trim() || loading) return; sendMessageWithText(input.trim()); };

  const handleFileUpload = useCallback(async (file: File | null) => {
    if (!file || loading) return;
    try {
      if (file.type === "application/pdf" && file.size > MAX_UPLOAD_BYTES) {
        showToast(`⚠️ PDF is too large. Keep it under ${MAX_UPLOAD_TEXT}.`);
        return;
      }

      let prepared = file;
      if (file.type.startsWith("image/")) {
        prepared = await optimizeImageForUpload(file);
        if (prepared.size > MAX_UPLOAD_BYTES) {
          showToast(`⚠️ Image is too large. Keep it under ${MAX_UPLOAD_TEXT}.`);
          return;
        }
      }

      setPendingFile(prepared);
    } catch {
      showToast("⚠️ Could not prepare this image. Try another file.");
    }
  }, [loading, showToast]);

  useEffect(() => {
    const fn = (e: ClipboardEvent) => {
      if (pendingFile || loading) return;
      const items = e.clipboardData?.items; if (!items) return;
      for (const it of items) {
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const f = it.getAsFile(); if (f) { handleFileUpload(f); e.preventDefault(); break; }
        }
      }
    };
    document.addEventListener("paste", fn);
    return () => document.removeEventListener("paste", fn);
  }, [handleFileUpload, pendingFile, loading]);

  const sendFileWithPrompt = async () => {
    if (!pendingFile || loading) return;
    const file = pendingFile, prompt = filePrompt.trim();
    const isPdf = file.type === "application/pdf";
    const imgUrl = isPdf ? null : URL.createObjectURL(file);
    setPendingFile(null); setFilePrompt(""); setLoading(true);
    let cid = chatIdRef.current;
    if (!cid) { cid = await createNewChat(exam); if (!cid) { setLoading(false); return; } }
    setMessages(p => [...p, { role: "user", content: isPdf ? `📄 ${file.name}` : "", imageUrl: imgUrl || undefined, filePrompt: prompt || undefined }, { role: "assistant", content: "" }]);
    try {
      const fd = new FormData();
      fd.append("image", file); fd.append("exam", exam); fd.append("chatId", cid);
      if (prompt) fd.append("prompt", prompt);
      const r = await fetch(buildApiUrl("/image"), { method: "POST", body: fd });
      const raw = await r.text();
      let d: any = null;
      if (raw) {
        try { d = JSON.parse(raw); } catch {}
      }
      if (!r.ok) {
        const serverMsg = typeof d?.error === "string" ? d.error.trim() : "";
        const textMsg = raw && !raw.trim().startsWith("<") ? raw.trim() : "";
        const fallback = r.status === 413
          ? `File too large for server upload. Please keep it under ${MAX_UPLOAD_TEXT}.`
          : "Could not process file.";
        throw new Error(serverMsg || textMsg || fallback);
      }
      const ans = typeof d?.answer === "string" && d.answer.trim() ? d.answer.trim() : "⚠️ Could not process file.";
      typeText(ans, setMessages, () => { setLoading(false); loadChatList(); });
    } catch (err) {
      const msg = err instanceof Error && err.message.includes("JSON")
        ? `Upload failed before a valid response. Try a smaller file under ${MAX_UPLOAD_TEXT}.`
        : err instanceof Error
        ? err.message
        : `File processing failed. Try a smaller file under ${MAX_UPLOAD_TEXT}.`;
      setMessages(p => [...p.slice(0,-1), { role: "assistant", content: `⚠️ ${msg}` }]);
      showToast(`⚠️ ${msg}`);
      setLoading(false);
    }
  };

  const markdownComponents = useMemo<Components>(() => ({
    p: ({ children }) => <div style={{ margin: "4px 0" }}>{children}</div>,
    h1: ({ children }) => <h1 style={{ margin: "10px 0 6px", fontSize: "1.04rem", fontWeight: 800, color: G.gold, lineHeight: 1.4 }}>{children}</h1>,
    h2: ({ children }) => <h2 style={{ margin: "10px 0 6px", fontSize: "1rem", fontWeight: 800, color: G.gold, lineHeight: 1.45 }}>{children}</h2>,
    h3: ({ children }) => <h3 style={{ margin: "8px 0 5px", fontSize: "0.96rem", fontWeight: 700, color: G.gold, lineHeight: 1.45 }}>{children}</h3>,
    h4: ({ children }) => <h4 style={{ margin: "8px 0 5px", fontSize: "0.92rem", fontWeight: 700, color: G.gold, lineHeight: 1.45 }}>{children}</h4>,
    strong: ({ children }) => <strong style={{ color: G.gold, fontWeight: 800 }}>{children}</strong>,
    li: ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
    img: (props) => (
      <ImageComponent
        src={typeof props.src === "string" ? props.src : undefined}
        alt={typeof props.alt === "string" ? props.alt : ""}
        onRegenerate={p => sendMessageWithText(`Generate image of ${p}`)}
        onZoom={setSelectedImage}
      />
    ),
  }), [sendMessageWithText]);

  const formatDate = (d: string) => {
    const date = new Date(d), diff = Date.now() - date.getTime(), days = Math.floor(diff / 86400000);
    if (days === 0) return "Today"; if (days === 1) return "Yesterday"; if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "row", minWidth: 0, overflow: "hidden" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .ask-input::placeholder{color:#94a3b8;opacity:1}
        .input-icon-btn:hover{background:rgba(0,0,0,0.05)}
      `}</style>

      {showSidebar && <div onClick={() => setShowSidebar(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 49 }} />}

      {/* Sidebar */}
      <div style={{ width: showSidebar ? 260 : 0, minWidth: showSidebar ? 260 : 0, height: "100%", background: "#FFFFFF", borderRight: "1px solid #E0E0E0", display: "flex", flexDirection: "column", overflow: "hidden", transition: "all 0.25s ease", flexShrink: 0, zIndex: 50, position: "fixed", top: 0, left: 0, bottom: 0, paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ padding: "14px 12px 10px", borderBottom: "1px solid #E0E0E0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${G.gold},${G.saffron})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎓</div>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>Exam<span style={{ color: G.gold }}>AI</span></span>
              <span style={{ fontSize: "0.68rem", color: G.gold, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Exam: {exam}</span>
            </div>
          </div>
          <button onClick={() => createNewChat()} style={{ width: "100%", padding: "9px 14px", background: `linear-gradient(135deg,${G.gold},${G.saffron})`, border: "none", borderRadius: 9, color: "#fff", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>New Chat
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
          {loadingChats ? <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.8rem", marginTop: 20 }}>Loading...</div>
            : chatList.length === 0 ? <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.8rem", marginTop: 20, padding: "0 12px" }}>No chats yet.</div>
            : chatList.map(chat => (
              <div key={chat._id} onClick={() => loadChat(chat._id)}
                style={{ padding: "9px 10px", borderRadius: 8, cursor: "pointer", background: currentChatId === chat._id ? "#F9F6EE" : "transparent", marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.8rem", color: "#334155", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chat.title || "New Chat"}</div>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 2 }}>{formatDate(chat.updatedAt)}</div>
                </div>
                <button onClick={(e) => deleteChat(chat._id, e)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 3, flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            ))
          }
        </div>
        <div style={{ padding: "12px", borderTop: "1px solid #E0E0E0", flexShrink: 0 }}>
          <Link href="/delete-account" style={{ display: "flex", alignItems: "center", gap: 8, color: G.error, textDecoration: "none", fontSize: "0.82rem", padding: "8px 10px", borderRadius: 8, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Delete Account
          </Link>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", position: "relative" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#FFFFFF", borderBottom: "1px solid #E0E0E0", flexShrink: 0, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={e => { e.stopPropagation(); setShowSidebar(!showSidebar); }} style={{ width: 32, height: 32, background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${G.gold},${G.saffron})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>Ask AI</span>
              <span style={{ fontSize: "0.67rem", color: G.gold }}>Assigned: {exam}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesWrapRef}
          onScroll={updateScrollState}
          style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column", background: "#F9F6EE" }}
        >
          {isEmpty ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 16px", gap: 18 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg,${G.gold},${G.saffron})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 12px" }}>🤖</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>What can I help with?</div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Ask any {exam} question</div>
              </div>
              
            </div>
          ) : (
            <div style={{ padding: "12px 0 4px", display: "flex", flexDirection: "column", gap: 2 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ animation: "fadeIn 0.18s ease" }}>
                  {msg.role === "user" ? (
                    <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 14px" }}>
                      <div style={{ background: G.gold, borderRadius: "14px 14px 3px 14px", padding: msg.imageUrl ? "6px" : "10px 14px", maxWidth: "82%", wordBreak: "break-word" }}>
                        {msg.imageUrl && <ImageComponent src={msg.imageUrl} alt="uploaded" onZoom={setSelectedImage} />}
                        {msg.filePrompt && <div style={{ marginTop: msg.imageUrl ? 6 : 0, padding: "4px 8px", fontSize: "0.88rem", color: "#fff", lineHeight: 1.5 }}>{msg.filePrompt}</div>}
                        {!msg.imageUrl && msg.content && <div style={{ fontSize: "0.88rem", lineHeight: 1.65, color: "#fff" }}>{msg.content}</div>}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, padding: "6px 14px", alignItems: "flex-start" }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: `linear-gradient(135deg,${G.gold},${G.saffron})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, marginTop: 3 }}>🤖</div>
                      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                        {msg.content === "" && loading ? (
                          <div style={{ display: "flex", gap: 5, alignItems: "center", height: 28 }}>
                            {[0,1,2].map(j => <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: G.gold, animation: `bounce 0.8s ${j*0.15}s infinite` }} />)}
                          </div>
                        ) : msg.imageUrl ? (
                          <ImageComponent src={msg.imageUrl} alt={msg.imagePrompt || ""} onRegenerate={p => sendMessageWithText(`Generate image of ${p || msg.imagePrompt || "a new scene"}`)} onZoom={setSelectedImage} />
                        ) : (
                          <div style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "#334155", wordBreak: "break-word" }}>
                            <ReactMarkdown components={markdownComponents} urlTransform={markdownUrlTransform}>{msg.content}</ReactMarkdown>
                            {loading && i === messages.length - 1 && msg.content !== "" && <span style={{ animation: "blink 0.9s step-end infinite", color: G.gold }}>▍</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={msgEndRef} style={{ height: 4 }} />
            </div>
          )}
        </div>

        {showScrollDown && (
          <button onClick={() => scrollToBottom("smooth")}
            style={{ position: "absolute", right: 16, bottom: "calc(90px + env(safe-area-inset-bottom, 0px))", width: 40, height: 40, borderRadius: "50%", border: `1px solid ${G.border}`, background: `linear-gradient(135deg,${G.gold},${G.saffron})`, color: "#fff", cursor: "pointer", zIndex: 24, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(77,140,122,0.25)" }}
            aria-label="Scroll to latest message">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></svg>
          </button>
        )}
        <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>

        {/* Input */}
        <div style={{ flexShrink: 0, padding: "10px 12px calc(12px + env(safe-area-inset-bottom, 0px))", background: "#ffffff", borderTop: isEmpty ? "none" : "1px solid #e2e8f0" }}>
          {pendingFile && (
            <div style={{ background: "#FFFFFF", border: "1px solid #E0E0E0", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{pendingFile.type === "application/pdf" ? "📄" : "📷"}</span>
                  <span style={{ fontSize: "0.78rem", color: "#64748b", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pendingFile.name}</span>
                </div>
                <button onClick={() => { setPendingFile(null); setFilePrompt(""); }} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
              </div>
              <textarea value={filePrompt} onChange={e => setFilePrompt(e.target.value)} placeholder="Ask something about this file... (optional)" rows={2}
                style={{ width: "100%", background: "#FFFFFF", border: "1px solid #E0E0E0", borderRadius: 8, padding: "8px 10px", color: "#334155", fontSize: "0.86rem", outline: "none", resize: "none", fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 8 }} />
              <button onClick={sendFileWithPrompt} style={{ width: "100%", padding: "9px", background: `linear-gradient(135deg,${G.gold},${G.saffron})`, border: "none", borderRadius: 8, color: "#fff", fontSize: "0.86rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Send →</button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "#FFFFFF", border: "1px solid #E0E0E0", borderRadius: 18, padding: "7px 8px 7px 10px", transition: "border-color 0.2s", boxShadow: "0 4px 16px #E0E0E0" }}>
            <button className="input-icon-btn" onClick={() => fileRef.current?.click()} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#94a3b8", flexShrink: 0, marginBottom: 1, background: "transparent", border: "none", transition: "background 0.15s" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={e => { handleFileUpload(e.target.files?.[0] || null); if (e.target) e.target.value = ""; }} />
            <textarea className="ask-input" ref={taRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask AI anything..."
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              rows={1} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#334155", lineHeight: 1.45, maxHeight: 160, minHeight: 30, paddingTop: 6, paddingBottom: 6, caretColor: G.gold, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 17, fontWeight: 500, resize: "none" }} />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              style={{ width: 36, height: 36, borderRadius: 10, background: loading || !input.trim() ? "#e2e8f0" : `linear-gradient(135deg,${G.gold},${G.saffron})`, border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s", marginBottom: 1 }}>
              {loading ? <div style={{ width: 13, height: 13, border: "2px solid rgba(77,140,122,0.3)", borderTopColor: G.gold, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={loading || !input.trim() ? "#94a3b8" : "#fff"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>}
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 8, fontSize: "0.68rem", color: "#94a3b8" }}>ExamAI can make mistakes. Check important info.</div>
        </div>
      </div>

      {/* Image zoom */}
      {selectedImage && (
        <div onClick={() => setSelectedImage(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s ease", cursor: "zoom-out" }}>
          <img src={selectedImage} alt="Full" style={{ maxWidth: "94%", maxHeight: "94%", borderRadius: 8, objectFit: "contain", cursor: "default" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setSelectedImage(null)} style={{ position: "absolute", top: 20, right: 20, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: G.error, color: "#fff", padding: "9px 16px", borderRadius: 10, fontSize: "0.8rem", fontWeight: 500, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
