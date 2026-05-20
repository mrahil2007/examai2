"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  type ConfirmationResult,
} from "firebase/auth";
import { getFirebaseAuth, getMissingFirebaseEnvVars } from "@/lib/firebase";
import { useUser } from "@/context/UserContext";

// ─── LAZY IMPORTS (mobile screens) ───────────────────────────────────────────
const FlashcardsScreen     = dynamic(() => import("./FlashcardsScreen"),     { ssr: false });
const MockTestScreen       = dynamic(() => import("./MockTestScreen"),       { ssr: false });
const AskAIScreen          = dynamic(() => import("./AskAIScreen"),          { ssr: false });
const CurrentAffairsScreen = dynamic(() => import("./CurrentAffairsScreen"), { ssr: false });
const ProfileScreen        = dynamic(() => import("./ProfileScreen"),        { ssr: false });
const SplashScreen         = dynamic(() => import("./SplashScreen"),         { ssr: false });

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";
const PLAYSTORE_URL = process.env.NEXT_PUBLIC_PLAYSTORE_URL || "https://play.google.com/store/search?q=examai&c=apps";
const EXAMS = ["UPSC","JEE","NEET","CLAT-UG","CUET-UG","NDA","UGC-NET","GATE","GMAT","SSC","Banking","Railway","CAT","State PCS","General"];
const CA_CATEGORIES = ["All","National","International","Economy","Science & Tech","Sports","Environment","Awards","Defence","Health"];

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface UserLocal { uid: string; name: string; email: string; exam: string; }
interface Msg  { role: "user" | "ai"; text: string; }
interface CAItem { id: string; category: string; headline: string; summary: string; content?: string; importance: string; examRelevance: string; }
type MobileTab = "home" | "news" | "quiz" | "flashcards" | "profile" | "ai";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --navy: #F9F6EE; --navy2: #F9F6EE; --navy3: #F9F6EE;
    --card: #FFFFFF; --card2: #FFFFFF;
    --teal: #00674f; --teal-l: #008a6a;
    --teal-dim: rgba(0,103,79,0.12); --teal-glow: rgba(0,103,79,0.3);
    --border: #E0E0E0; --border-t: rgba(0,103,79,0.2);
    --text: #1a1a1a; --text2: #475569; --text3: #64748b;
    --font-h: 'Bricolage Grotesque', sans-serif;
    --font-b: 'Plus Jakarta Sans', sans-serif;
    --bottom-bar-h: 80px;
  }
  html { scroll-behavior: smooth; }
  body { background: var(--navy); color: var(--text); font-family: var(--font-b); }
  input, select, textarea, button { font-family: var(--font-b); }
  input::placeholder { color: var(--text3); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--navy2); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .desktop-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100; height: 64px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 40px; backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border); background: rgba(249,246,238,0.92);
  }
  @media (max-width: 768px) { .desktop-nav { display: none; } }

  .mobile-topbar {
    display: none; position: fixed; top: 0; left: 0; right: 0; z-index: 100; height: 56px;
    align-items: center; justify-content: space-between;
    padding: 0 20px; backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border); background: rgba(249,246,238,0.97);
  }
  @media (max-width: 768px) { .mobile-topbar { display: flex; } }

  .bottom-tab-bar {
    display: none; position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
    height: var(--bottom-bar-h); background: transparent;
    align-items: flex-end; justify-content: center;
    padding: 0 12px calc(10px + env(safe-area-inset-bottom, 0px));
  }
  @media (max-width: 768px) { .bottom-tab-bar { display: flex; } }
  .tab-bar-inner {
    width: 100%; height: 60px; background: rgba(255,255,255,0.98);
    border: 1px solid var(--border); border-radius: 22px;
    display: flex; align-items: center; justify-content: space-around;
    padding: 0 4px; position: relative; backdrop-filter: blur(20px);
  }
  .tab-item {
    display: flex; flex-direction: column; align-items: center;
    gap: 3px; flex: 1; padding: 6px 4px; border: none; background: none;
    color: var(--text3); cursor: pointer; transition: color .2s;
    border-radius: 13px; position: relative; z-index: 1;
  }
  .tab-item.active { color: var(--teal); }
  .tab-icon { font-size: 18px; line-height: 1; transition: transform .3s cubic-bezier(0.34,1.56,0.64,1); }
  .tab-item.active .tab-icon { transform: translateY(-2px); }
  .tab-label { font-size: 9px; font-weight: 700; letter-spacing: .04em; }
  .tab-ai {
    flex: 0 0 52px; width: 52px; height: 52px; border-radius: 50%;
    background: var(--teal); border: 2px solid rgba(0,201,147,0.3);
    display: flex; align-items: center; justify-content: center;
    color: #fff; margin-top: -16px; box-shadow: 0 8px 24px rgba(0,103,79,0.5);
    transition: transform .2s, background .2s;
  }
  .tab-ai.active { background: var(--teal-l); transform: scale(1.08); }

  .page-wrapper { padding-top: 64px; }
  @media (max-width: 768px) {
    .page-wrapper { padding-top: 56px; padding-bottom: var(--bottom-bar-h); }
  }
  .mobile-section { display: block; }
  @media (max-width: 768px) {
    .mobile-section { display: none; }
    .mobile-section.active { display: block; }
    .desktop-only { display: none !important; }
  }

  .logo { font-family: var(--font-h); font-size: 20px; font-weight: 800; }
  .logo span { color: var(--teal); }
  .nav-links { display: flex; gap: 28px; }
  .nav-links a { color: var(--text2); text-decoration: none; font-size: 14px; font-weight: 500; transition: color .2s; }
  .nav-links a:hover { color: var(--text); }
  .nav-right { display: flex; gap: 10px; align-items: center; }

  .btn-ghost { background: none; border: 1px solid var(--border); color: var(--text); padding: 8px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; }
  .btn-ghost:hover { border-color: var(--teal); color: var(--teal); }
  .btn-teal { background: var(--teal); color: #fff; padding: 8px 18px; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s; }
  .btn-teal:hover { background: var(--teal-l); transform: translateY(-1px); box-shadow: 0 6px 20px var(--teal-glow); }
  .btn-teal:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }

  .profile-trigger {
    border: 1px solid var(--border-t); background: #fff; color: var(--text);
    border-radius: 999px; padding: 4px 12px 4px 4px; display: inline-flex;
    align-items: center; gap: 8px; cursor: pointer; transition: all .2s;
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  }
  .profile-trigger:hover { border-color: var(--teal); transform: translateY(-1px); box-shadow: 0 12px 28px rgba(0,103,79,0.12); }
  .profile-trigger.compact { width: 36px; height: 36px; padding: 3px; justify-content: center; box-shadow: none; }
  .profile-trigger.compact:hover { transform: none; }
  .profile-ring {
    width: 30px; height: 30px; border-radius: 50%;
    background: linear-gradient(135deg, var(--teal), var(--teal-l));
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    color: #fff; font-size: 11px; font-weight: 800; letter-spacing: .02em;
  }
  .profile-trigger.compact .profile-ring { width: 28px; height: 28px; }
  .profile-trigger-name { font-size: 13px; font-weight: 700; max-width: 92px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .hero { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; padding: 80px 60px 60px; max-width: 1280px; margin: 0 auto; }
  @media (max-width: 900px) { .hero { grid-template-columns: 1fr; padding: 40px 24px 40px; } }
  @media (max-width: 768px) { .hero { min-height: unset; padding: 28px 20px 32px; gap: 24px; } }
  .hero-right { display: block; }
  @media (max-width: 900px) { .hero-right { display: none; } }
  .hero-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border: 1px solid var(--border-t); border-radius: 999px; font-size: 12px; color: var(--teal); background: var(--teal-dim); margin-bottom: 20px; font-weight: 600; }
  @media (max-width: 768px) { .hero-badge { font-size: 11px; margin-bottom: 14px; } }
  h1 { font-family: var(--font-h); font-size: clamp(32px,5vw,60px); font-weight: 800; line-height: 1.1; letter-spacing: -2px; margin-bottom: 20px; }
  @media (max-width: 768px) { h1 { font-size: 28px; letter-spacing: -1px; margin-bottom: 12px; } }
  h1 span { color: var(--teal); }
  .hero p { color: var(--text2); font-size: 16px; line-height: 1.7; margin-bottom: 32px; max-width: 480px; }
  @media (max-width: 768px) { .hero p { font-size: 14px; margin-bottom: 20px; } }
  .hero-btns { display: flex; gap: 12px; margin-bottom: 40px; flex-wrap: wrap; }
  @media (max-width: 768px) { .hero-btns { margin-bottom: 24px; } }
  .hero-btns .btn-teal { padding: 14px 28px; font-size: 15px; }
  .hero-btns .btn-ghost { padding: 14px 24px; font-size: 14px; }
  @media (max-width: 768px) { .hero-btns .btn-teal { padding: 12px 20px; font-size: 14px; flex: 1; } .hero-btns .btn-ghost { padding: 12px 16px; font-size: 13px; } }
  .stats-row { display: flex; gap: 32px; flex-wrap: wrap; }
  @media (max-width: 768px) { .stats-row { gap: 16px; } }
  .stat { display: flex; flex-direction: column; }
  .stat-n { font-family: var(--font-h); font-size: 26px; font-weight: 800; color: var(--teal); }
  @media (max-width: 768px) { .stat-n { font-size: 20px; } }
  .stat-l { font-size: 12px; color: var(--text3); margin-top: 2px; }

  section { padding: 80px 60px; max-width: 1280px; margin: 0 auto; }
  @media (max-width: 768px) { section { padding: 32px 20px; } }
  .section-label { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 700; color: var(--teal); margin-bottom: 12px; }
  h2 { font-family: var(--font-h); font-size: clamp(24px,4vw,44px); font-weight: 800; letter-spacing: -1.5px; line-height: 1.1; margin-bottom: 16px; }
  @media (max-width: 768px) { h2 { font-size: 22px; letter-spacing: -0.5px; } }
  h2 span { color: var(--teal); }
  .sub { color: var(--text2); font-size: 15px; line-height: 1.7; max-width: 520px; margin-bottom: 40px; }
  @media (max-width: 768px) { .sub { font-size: 13px; margin-bottom: 24px; } }

  .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
  .card:hover { border-color: var(--border-t); }

  /* ── SIMPLE CHAT (desktop hero) ── */
  .chat-wrap { display: flex; flex-direction: column; height: 520px; background: var(--card); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px #E0E0E0; }
  @media (max-width: 768px) { .chat-wrap { height: calc(100vh - 56px - var(--bottom-bar-h) - 32px); border-radius: 0; border: none; border-top: 1px solid var(--border); } }
  .chat-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--border); background: var(--navy2); flex-shrink: 0; }
  .chat-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); }
  .chat-msgs { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .msg-user { align-self: flex-end; background: var(--teal); color: #fff; padding: 10px 14px; border-radius: 16px 16px 4px 16px; font-size: 13px; max-width: 85%; line-height: 1.5; }
  .msg-ai { align-self: flex-start; background: var(--navy2); border: 1px solid var(--border); padding: 10px 14px; border-radius: 16px 16px 16px 4px; font-size: 13px; max-width: 85%; line-height: 1.6; color: var(--text); }
  .msg-thinking { align-self: flex-start; padding: 10px 14px; }
  .thinking-dots span { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--teal); margin: 0 2px; animation: bounce .8s infinite; }
  .thinking-dots span:nth-child(2) { animation-delay: .15s; }
  .thinking-dots span:nth-child(3) { animation-delay: .3s; }
  @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
  .chat-input-row { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--border); flex-shrink: 0; }
  .chat-input { flex: 1; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--navy2); color: var(--text); font-size: 13px; outline: none; }
  .chat-input:focus { border-color: var(--border-t); }
  .chat-send { padding: 10px 16px; border-radius: 12px; background: var(--teal); color: #fff; border: none; font-size: 16px; font-weight: 700; cursor: pointer; }
  .chat-send:disabled { opacity: .5; cursor: not-allowed; }
  .suggested { display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
  .sugg-btn { text-align: left; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--navy2); color: var(--text2); font-size: 12px; cursor: pointer; transition: all .2s; }
  .sugg-btn:hover { border-color: var(--teal); color: var(--teal); }
  .exam-select { background: var(--navy2); border: 1px solid var(--border); color: var(--text2); border-radius: 8px; padding: 6px 10px; font-size: 12px; outline: none; cursor: pointer; }
  .free-limit { text-align: center; padding: 12px; border-radius: 12px; border: 1px solid var(--border-t); background: var(--teal-dim); color: var(--teal); font-size: 12px; font-weight: 600; }
  .free-limit button { background: none; border: none; color: var(--teal); text-decoration: underline; cursor: pointer; font-size: 12px; font-weight: 700; }

  /* ── CURRENT AFFAIRS (desktop) ── */
  .ca-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
  @media (max-width: 768px) { .ca-filters { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; } .ca-filters::-webkit-scrollbar { display: none; } }
  .ca-filter { padding: 6px 14px; border-radius: 999px; border: 1px solid var(--border); background: none; color: var(--text3); font-size: 11px; font-weight: 600; cursor: pointer; transition: all .2s; white-space: nowrap; flex-shrink: 0; }
  .ca-filter.active { border-color: var(--teal); color: var(--teal); background: var(--teal-dim); }
  .ca-items { display: flex; flex-direction: column; gap: 10px; }
  .ca-item { display: flex; gap: 12px; padding: 14px 18px; border-radius: 14px; border: 1px solid var(--border); background: var(--card); cursor: pointer; transition: all .2s; align-items: flex-start; }
  .ca-item:hover { border-color: var(--border-t); transform: translateX(4px); background: var(--card2); }
  @media (max-width: 768px) { .ca-item:hover { transform: none; } }
  .ca-tag { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; background: var(--teal-dim); color: var(--teal); white-space: nowrap; margin-top: 2px; }
  .ca-text { font-size: 13px; line-height: 1.5; color: var(--text); }
  .ca-meta { font-size: 11px; color: var(--text3); margin-top: 4px; }

  /* ── NEWS DRAWER ── */
  .drawer-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); opacity: 0; pointer-events: none; transition: opacity .25s; }
  .drawer-overlay.open { opacity: 1; pointer-events: all; }
  .news-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 480px; max-width: 95vw; z-index: 201; background: var(--card); border-left: 1px solid var(--border-t); display: flex; flex-direction: column; transform: translateX(100%); transition: transform .28s cubic-bezier(0.32,0,0.2,1); }
  @media (max-width: 768px) { .news-drawer { top: auto; left: 0; right: 0; bottom: 0; width: 100%; max-width: 100%; border-left: none; border-top: 1px solid var(--border-t); border-radius: 20px 20px 0 0; max-height: 80vh; transform: translateY(100%); } .news-drawer.open { transform: translateY(0); } }
  .news-drawer.open { transform: translateX(0); }
  .drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .drawer-close { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.06); border: none; color: var(--text2); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .2s; }
  .drawer-close:hover { background: #E0E0E0; color: var(--text); }
  .drawer-body { flex: 1; overflow-y: auto; padding: 20px; }
  .drawer-foot { padding: 16px 20px; border-top: 1px solid var(--border); flex-shrink: 0; }
  .btn-drawer-ask { width: 100%; padding: 12px; background: var(--teal); border: none; border-radius: 12px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .btn-drawer-ask:hover { background: var(--teal-l); }
  .skeleton { background: var(--card); border-radius: 14px; border: 1px solid var(--border); height: 64px; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }

  /* ── FEATURES ── */
  .feat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 48px; }
  @media (max-width: 768px) { .feat-grid { grid-template-columns: 1fr; gap: 12px; margin-top: 24px; } }
  .feat-card { padding: 28px; border-radius: 20px; border: 1px solid var(--border); background: var(--card); transition: all .2s; box-shadow: 0 8px 32px #E0E0E0; }
  .feat-card:hover { border-color: var(--border-t); transform: translateY(-3px); }
  @media (max-width: 768px) { .feat-card { padding: 18px; } .feat-card:hover { transform: none; } }
  .feat-icon { font-size: 32px; margin-bottom: 14px; }
  .feat-title { font-family: var(--font-h); font-size: 18px; font-weight: 700; margin-bottom: 8px; }
  .feat-desc { font-size: 13px; color: var(--text2); line-height: 1.6; }

  /* ── EXAM GRID ── */
  .exam-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px,1fr)); gap: 12px; margin-top: 40px; }
  @media (max-width: 768px) { .exam-grid { grid-template-columns: repeat(3,1fr); gap: 10px; margin-top: 20px; } }
  .exam-card { padding: 20px 16px; border-radius: 16px; border: 1px solid var(--border); background: var(--card); text-align: center; cursor: pointer; transition: all .2s; box-shadow: 0 4px 16px #E0E0E0; }
  .exam-card:hover { border-color: var(--border-t); transform: translateY(-2px); }
  @media (max-width: 768px) { .exam-card { padding: 14px 10px; } .exam-card:hover { transform: none; } }
  .exam-card .ico { font-size: 28px; margin-bottom: 8px; }
  @media (max-width: 768px) { .exam-card .ico { font-size: 22px; margin-bottom: 6px; } }
  .exam-card .name { font-size: 14px; font-weight: 700; }
  @media (max-width: 768px) { .exam-card .name { font-size: 12px; } }
  .exam-card .sub { font-size: 11px; color: var(--text3); margin-top: 2px; }
  @media (max-width: 768px) { .exam-card .sub { font-size: 10px; } }

  /* ── AUTH MODAL ── */
  .overlay { position: fixed; inset: 0; z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); }
  @media (max-width: 768px) { .overlay { align-items: flex-end; padding: 0; } }
  .modal { background: var(--card); border: 1px solid var(--border-t); border-radius: 24px; padding: 36px; width: 100%; max-width: 420px; position: relative; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px #E0E0E0; }
  @media (max-width: 768px) { .modal { border-radius: 24px 24px 0 0; padding: 28px 24px 40px; max-height: 92vh; border-bottom: none; } }
  .modal::-webkit-scrollbar { display: none; }
  .drag-handle { display: none; width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: 0 auto 20px; }
  @media (max-width: 768px) { .drag-handle { display: block; } }
  .modal-close { position: absolute; top: 14px; right: 18px; background: none; border: none; color: var(--text3); font-size: 20px; cursor: pointer; }
  @media (max-width: 768px) { .modal-close { display: none; } }
  .modal-logo { text-align: center; font-family: var(--font-h); font-size: 24px; font-weight: 800; margin-bottom: 6px; }
  .modal-sub { text-align: center; font-size: 13px; color: var(--text3); margin-bottom: 24px; }
  .tabs { display: flex; gap: 4px; margin-bottom: 20px; padding: 4px; background: rgba(255,255,255,0.04); border-radius: 12px; }
  .tab { flex: 1; padding: 10px; border-radius: 9px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; }
  .tab.active { background: var(--teal); color: #fff; }
  .tab.inactive { background: none; color: var(--text3); }
  .field { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border); background: var(--navy2); color: var(--text); font-size: 14px; outline: none; margin-bottom: 10px; transition: border .2s; }
  .field:focus { border-color: var(--border-t); }
  .err { background: rgba(255,60,60,.1); border: 1px solid rgba(255,60,60,.3); color: #ff6b6b; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 12px; }
  .divider { display: flex; align-items: center; gap: 12px; margin: 16px 0; color: var(--text3); font-size: 12px; }
  .divider::before,.divider::after { content:''; flex:1; height:1px; background: var(--border); }
  .btn-google { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--navy2); color: var(--text); font-size: 14px; font-weight: 600; cursor: pointer; transition: all .2s; display: flex; align-items: center; justify-content: center; gap: 10px; }
  .btn-google:hover { border-color: var(--border-t); }
  .btn-submit { width: 100%; padding: 14px; border-radius: 12px; border: none; background: var(--teal); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .2s; margin-top: 4px; }
  .btn-submit:hover { background: var(--teal-l); }
  .btn-submit:disabled { opacity: .6; cursor: not-allowed; }
  .otp-row { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; }
  .otp-input { width: 44px; height: 48px; text-align: center; border-radius: 10px; border: 1px solid var(--border); background: var(--navy2); color: var(--text); font-size: 20px; font-weight: 700; outline: none; transition: border .2s; }
  .otp-input:focus { border-color: var(--teal); }
  #recaptcha-container { display: flex; justify-content: center; margin-bottom: 12px; }
  .timer-row { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 14px; font-size: 13px; }
  .timer-text { color: var(--text3); }
  .timer-count { color: var(--teal); font-weight: 700; min-width: 28px; }
  .resend-btn { background: none; border: none; color: var(--teal); font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 0; }
  .resend-btn:disabled { color: var(--text3); cursor: not-allowed; text-decoration: none; }

  .testi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px,1fr)); gap: 20px; margin-top: 48px; }
  @media (max-width: 768px) { .testi-grid { grid-template-columns: 1fr; gap: 12px; margin-top: 24px; } }
  .testi-card { padding: 24px; border-radius: 20px; border: 1px solid var(--border); background: var(--card); }
  .testi-text { font-size: 14px; line-height: 1.7; color: var(--text2); margin-bottom: 16px; }
  .testi-name { font-size: 14px; font-weight: 700; }
  .testi-exam { font-size: 12px; color: var(--teal); margin-top: 2px; }
  .stars { color: #fbbf24; font-size: 13px; margin-bottom: 10px; }

  .cta-box { background: linear-gradient(135deg, var(--card) 0%, var(--card2) 100%); border: 1px solid var(--border-t); border-radius: 28px; padding: 64px; text-align: center; }
  @media (max-width: 768px) { .cta-box { padding: 36px 24px; border-radius: 20px; } }
  .cta-box h2 { font-size: clamp(24px,5vw,48px); margin-bottom: 16px; }
  .cta-box p { color: var(--text2); font-size: 16px; margin-bottom: 32px; }
  @media (max-width: 768px) { .cta-box p { font-size: 14px; margin-bottom: 24px; } }

  footer { border-top: 1px solid var(--border); padding: 40px 60px; text-align: center; color: var(--text3); font-size: 13px; }
  @media (max-width: 768px) { footer { padding: 32px 20px; } }
  .user-badge { font-size: 13px; color: var(--text2); }
  .seo-h { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

  /* ── AUTH GATE (mobile) ── */
  .mobile-auth-gate {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 40px 24px; min-height: calc(100vh - 56px - var(--bottom-bar-h));
    text-align: center;
  }

  /* ── WEB APP MODE (force tab shell on all widths) ── */
  .webapp-shell .desktop-nav { display: none !important; }
  .webapp-shell .mobile-topbar { display: flex !important; }
  .webapp-shell .bottom-tab-bar { display: flex !important; }
  .webapp-shell .page-wrapper {
    padding-top: 56px !important;
    padding-bottom: var(--bottom-bar-h) !important;
    max-width: 960px;
    margin: 0 auto;
  }
  .webapp-shell .mobile-section { display: none; }
  .webapp-shell .mobile-section.active {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 56px - var(--bottom-bar-h));
    overflow: hidden;
  }
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function makeUid(email: string) {
  let h = 0;
  for (let i = 0; i < email.length; i++) { h = ((h << 5) - h) + email.charCodeAt(i); h |= 0; }
  return `user_${Math.abs(h).toString(36)}_${email.replace(/[^a-z0-9]/gi,"").slice(0,8)}`;
}
function getAnonId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("examai_anon");
  if (!id) { id = `anon_${Math.random().toString(36).slice(2)}`; localStorage.setItem("examai_anon", id); }
  return id;
}
function getInitials(user: UserLocal | null) {
  const source = (user?.name || user?.email || "User").trim();
  const words = source.split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2);
  return initials.toUpperCase();
}

// ─── MARKDOWN (desktop hero chat only) ───────────────────────────────────────
function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return <>{parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color:"var(--teal)", fontWeight:700 }}>{part}</strong> : part)}</>;
}
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^#{1,3}\s/.test(line)) {
      elements.push(<div key={i} style={{fontWeight:700,color:"var(--teal)",fontSize:14,marginTop:10,marginBottom:2}}>{inlineFormat(line.replace(/^#{1,3}\s+/,""))}</div>);
    } else if (/^\s*[\*\-•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[\*\-•]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[\*\-•]\s+/,"")); i++; }
      elements.push(<ul key={`ul-${i}`} style={{paddingLeft:0,margin:"6px 0",display:"flex",flexDirection:"column",gap:4}}>{items.map((item,j)=><li key={j} style={{fontSize:13,lineHeight:1.6,color:"var(--text)",listStyle:"none",display:"flex",gap:8,alignItems:"flex-start"}}><span style={{color:"var(--teal)",marginTop:2,flexShrink:0}}>▸</span><span>{inlineFormat(item)}</span></li>)}</ul>);
      continue;
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{height:6}} />);
    } else {
      elements.push(<div key={i} style={{fontSize:13,lineHeight:1.6,color:"var(--text)"}}>{inlineFormat(line)}</div>);
    }
    i++;
  }
  return elements;
}

// ─── OTP TIMER ────────────────────────────────────────────────────────────────
function useOtpTimer(seconds = 15) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimer = useCallback(() => {
    setTimeLeft(seconds); setCanResend(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { clearInterval(intervalRef.current!); setCanResend(true); return 0; } return prev - 1; });
    }, 1000);
  }, [seconds]);
  const resetTimer = useCallback(() => { if (intervalRef.current) clearInterval(intervalRef.current); setTimeLeft(0); setCanResend(false); }, []);
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);
  return { timeLeft, canResend, startTimer, resetTimer, isRunning: timeLeft > 0 };
}

// ─── PROFILE PANEL ───────────────────────────────────────────────────────────
function ProfileIconButton({ user, onClick, compact = false }: { user: UserLocal; onClick: () => void; compact?: boolean }) {
  return (
    <button className={`profile-trigger ${compact ? "compact" : ""}`} onClick={onClick} aria-label="Open profile">
      <span className="profile-ring">{getInitials(user)}</span>
      {!compact && <span className="profile-trigger-name">{user.name?.split(" ")[0] || "Profile"}</span>}
    </button>
  );
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
function AuthModal({ onClose, onLogin }: { onClose: () => void; onLogin: (u: UserLocal) => void }) {
  const [tab, setTab] = useState<"login"|"register"|"phone">("login");
  const [form, setForm] = useState({ name:"", email:"", password:"", exam:"", phone:"" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState(["","","","","",""]);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const otpRefs = useRef<(HTMLInputElement|null)[]>([]);
  const { timeLeft, canResend, startTimer, resetTimer, isRunning } = useOtpTimer(15);
  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setPhone = (v: string) => setForm((f) => ({ ...f, phone: v.replace(/\D/g, "").slice(0, 10) }));
  const clearRecaptchaVerifier = useCallback(() => {
    if (!recaptchaVerifierRef.current) return;
    try { recaptchaVerifierRef.current.clear(); } catch {}
    recaptchaVerifierRef.current = null;
  }, []);

  useEffect(() => () => { clearRecaptchaVerifier(); }, [clearRecaptchaVerifier]);

  const syncUserToApi = useCallback(async (user: UserLocal) => {
    try {
      await fetch(`${API}/user/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, userName: user.name, exam: user.exam }),
      });
    } catch (e) {
      console.warn("User sync failed (non-blocking):", e);
    }
  }, []);

  const mergeAnonMemory = useCallback((userId: string) => {
    const anonId = getAnonId();
    fetch(`${API}/user/merge-memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonId, userId }),
    }).catch((e) => {
      console.warn("Anon memory merge failed (non-blocking):", e);
    });
  }, []);

  const switchTab = (t: "login"|"register"|"phone") => {
    setTab(t);
    setErr("");
    setOtpStep(false);
    setConfirmationResult(null);
    clearRecaptchaVerifier();
    resetTimer();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setErr("");
    try {
      const uid = makeUid(form.email);
      if (tab === "register") {
        if (!form.name.trim()) { setErr("Name is required."); setLoading(false); return; }
        if (localStorage.getItem(`ep_${uid}`)) { setErr("Account already exists. Please log in."); setLoading(false); return; }
        localStorage.setItem(`ep_${uid}`, form.password);
        localStorage.setItem(`name_${uid}`, form.name);
      } else {
        const stored = localStorage.getItem(`ep_${uid}`);
        if (stored && stored !== form.password) { setErr("Wrong password."); setLoading(false); return; }
      }
      const savedName = localStorage.getItem(`name_${uid}`);
      const user: UserLocal = { uid, email: form.email, exam: form.exam||"UPSC", name: tab==="register" ? form.name : (savedName || form.email.split("@")[0]) };
      localStorage.setItem("examai_user", JSON.stringify(user));
      onLogin(user);
      void syncUserToApi(user);
      mergeAnonMemory(uid);
    } catch { setErr("Something went wrong. Try again."); }
    setLoading(false);
  };

  const sendOTP = async () => {
    if (!/^\d{10}$/.test(form.phone)) { setErr("Enter a valid 10-digit phone number."); return; }
    if (!form.name.trim()) { setErr("Name is required."); return; }
    setLoading(true); setErr("");
    try {
      const missingEnv = getMissingFirebaseEnvVars();
      if (missingEnv.length > 0) { setErr(`Firebase config missing: ${missingEnv.join(", ")}`); setLoading(false); return; }
      const auth = getFirebaseAuth();
      clearRecaptchaVerifier();
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
        "expired-callback": clearRecaptchaVerifier,
      });
      recaptchaVerifierRef.current = verifier;
      const result = await signInWithPhoneNumber(auth, `+91${form.phone}`, verifier);
      setConfirmationResult(result); setOtpStep(true); startTimer();
    } catch (e: unknown) {
      clearRecaptchaVerifier();
      const code = (e as { code?: string })?.code;
      const msg = (e as { message?: string })?.message;
      if (code === "auth/invalid-phone-number") setErr("Invalid phone number.");
      else if (code === "auth/too-many-requests") setErr("Too many attempts. Try after some time.");
      else if (code === "auth/billing-not-enabled") setErr("Phone auth requires Firebase Blaze plan.");
      else if (code === "auth/invalid-app-credential") setErr("Phone verification failed, try after 1 min.");
      else if (code === "auth/operation-not-allowed") setErr("Phone sign-in is disabled in Firebase Console.");
      else if (code === "auth/captcha-check-failed") setErr("reCAPTCHA check failed. Disable ad-blockers/VPN and retry.");
      else if (code === "auth/quota-exceeded") setErr("SMS quota exceeded. Try again later.");
      else if (code === "auth/network-request-failed") setErr("Network error. Check connection and retry.");
      else if (code === "auth/unauthorized-domain") setErr("Current domain is not authorized in Firebase Auth.");
      else setErr(msg || "Failed to send OTP. Try again.");
      console.warn("Phone OTP send failed:", { code, msg, error: e });
    }
    setLoading(false);
  };

  const resendOTP = async () => { if (!canResend) return; setOtp(["","","","","",""]); setErr(""); await sendOTP(); };

  const verifyOTP = async () => {
    const code = otp.join("");
    if (code.length < 6) { setErr("Enter the 6-digit OTP."); return; }
    if (!confirmationResult) { setErr("OTP session expired. Please resend OTP."); return; }
    setLoading(true); setErr("");
    try {
      const result = await confirmationResult.confirm(code);
      const fb = result.user;
      const user: UserLocal = { uid: fb.uid, name: form.name, email: fb.phoneNumber||"", exam: form.exam||"UPSC" };
      localStorage.setItem("examai_user", JSON.stringify(user));
      clearRecaptchaVerifier();
      setConfirmationResult(null);
      onLogin(user);
      void syncUserToApi(user);
      mergeAnonMemory(fb.uid);
    } catch { setErr("Invalid OTP. Try again."); }
    setLoading(false);
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[idx] = val.slice(-1); setOtp(next);
    if (val && idx < 5) otpRefs.current[idx+1]?.focus();
    if (!val && idx > 0) otpRefs.current[idx-1]?.focus();
  };

  const googleLogin = async () => {
    setErr("");
    try {
      const missingEnv = getMissingFirebaseEnvVars();
      if (missingEnv.length > 0) { setErr(`Firebase config missing: ${missingEnv.join(", ")}`); return; }
      const auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const fb = result.user;
      const user: UserLocal = { uid: fb.uid, name: fb.displayName||"", email: fb.email||"", exam:"UPSC" };
      localStorage.setItem("examai_user", JSON.stringify(user));
      onLogin(user);
      void syncUserToApi(user);
      mergeAnonMemory(fb.uid);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user") setErr("Google sign-in was cancelled.");
      else if (code === "auth/popup-blocked") setErr("Popup blocked. Please allow popups and try again.");
      else setErr((e as {message?:string})?.message || "Google login failed.");
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="drag-handle" />
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-logo">Exam<span style={{color:"var(--teal)"}}>AI</span></div>
        <div className="modal-sub">{tab==="phone" ? (otpStep ? "Enter the OTP sent to your phone" : "Sign in with phone number") : tab==="login" ? "Welcome back 👋" : "Create your free account"}</div>
        <div className="tabs">
          <button className={`tab ${tab==="login"?"active":"inactive"}`} onClick={()=>switchTab("login")}>Log In</button>
          <button className={`tab ${tab==="register"?"active":"inactive"}`} onClick={()=>switchTab("register")}>Sign Up</button>
          <button className={`tab ${tab==="phone"?"active":"inactive"}`} onClick={()=>switchTab("phone")}>📱 OTP</button>
        </div>
        {err && <div className="err">{err}</div>}
        {tab === "phone" ? (
          <div>
            {!otpStep ? (
              <>
                <input className="field" type="text" placeholder="Your full name" value={form.name} onChange={e=>up("name",e.target.value)} />
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <span style={{padding:"12px 14px",background:"var(--navy2)",border:"1px solid var(--border)",borderRadius:12,fontSize:14,color:"var(--text2)",flexShrink:0}}>+91</span>
                  <input className="field" style={{margin:0,flex:1}} type="tel" placeholder="10-digit mobile number" maxLength={10} value={form.phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <select className="field" value={form.exam} onChange={e=>up("exam",e.target.value)}>
                  <option value="">Target exam (optional)</option>
                  {EXAMS.map(x=><option key={x} value={x}>{x}</option>)}
                </select>
                <div id="recaptcha-container" />
                <button className="btn-submit" onClick={sendOTP} disabled={loading || isRunning}>
                  {loading ? "Sending OTP…" : isRunning ? `Wait ${timeLeft}s…` : "Send OTP →"}
                </button>
              </>
            ) : (
              <>
                <p style={{textAlign:"center",fontSize:13,color:"var(--text3)",marginBottom:16}}>OTP sent to +91 {form.phone}</p>
                <div className="otp-row">
                  {otp.map((digit, idx) => (
                    <input key={idx} ref={el => { otpRefs.current[idx] = el; }} className="otp-input" type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={e => handleOtpChange(idx, e.target.value)}
                      onKeyDown={e => e.key==="Backspace" && !digit && idx > 0 && otpRefs.current[idx-1]?.focus()} />
                  ))}
                </div>
                <div className="timer-row">
                  {isRunning ? (<><span className="timer-text">Resend OTP in</span><span className="timer-count">{timeLeft}s</span></>) : (<><span className="timer-text">Didn&apos;t receive OTP?</span><button className="resend-btn" onClick={resendOTP} disabled={!canResend || loading}>Resend</button></>)}
                </div>
                <button className="btn-submit" onClick={verifyOTP} disabled={loading}>{loading ? "Verifying…" : "Verify OTP →"}</button>
                <button style={{width:"100%",background:"none",border:"none",color:"var(--text3)",fontSize:12,cursor:"pointer",marginTop:8}} onClick={() => { setOtpStep(false); setConfirmationResult(null); clearRecaptchaVerifier(); resetTimer(); setOtp(["","","","","",""]); }}>← Change number</button>
              </>
            )}
          </div>
        ) : (
          <>
            <button className="btn-google" onClick={googleLogin}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <div className="divider">or use email</div>
            <form onSubmit={submit}>
              {tab==="register" && <input className="field" type="text" placeholder="Full name" required value={form.name} onChange={e=>up("name",e.target.value)} />}
              <input className="field" type="email" placeholder="Email address" required value={form.email} onChange={e=>up("email",e.target.value)} />
              <input className="field" type="password" placeholder="Password" required value={form.password} onChange={e=>up("password",e.target.value)} />
              {tab==="register" && (
                <select className="field" value={form.exam} onChange={e=>up("exam",e.target.value)}>
                  <option value="">Target exam (optional)</option>
                  {EXAMS.map(x=><option key={x} value={x}>{x}</option>)}
                </select>
              )}
              <button className="btn-submit" type="submit" disabled={loading}>{loading ? "Please wait…" : tab==="login" ? "Log In →" : "Create Account →"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SIMPLE AI CHAT (desktop hero widget only) ────────────────────────────────
function HeroChat({ user, anonId, onNeedAuth, prefill, onPrefillConsumed }: {
  user: UserLocal|null; anonId: string; onNeedAuth: ()=>void; prefill?: string; onPrefillConsumed?: ()=>void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [exam, setExam] = useState("UPSC");
  const [freeUsed, setFreeUsed] = useState(0);
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (prefill) { setInput(prefill); onPrefillConsumed?.(); } }, [prefill, onPrefillConsumed]);
  useEffect(() => { msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, thinking]);

  const send = useCallback(async (q: string) => {
    if (!q.trim() || thinking) return;
    if (!user && freeUsed >= 2) { onNeedAuth(); return; }
    setMsgs(m => [...m, { role:"user", text: q }]);
    setInput(""); setThinking(true);
    try {
      const r = await fetch(`${API}/chat`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ question: q, exam, userId: user?.uid, anonId: !user ? anonId : undefined, history: msgs.slice(-6).map(m => ({ role: m.role==="user"?"user":"assistant", content: m.text })) }) });
      const d = await r.json();
      setMsgs(m => [...m, { role:"ai", text: d.answer || d.error || "Sorry, try again." }]);
      if (!user) setFreeUsed(c => c+1);
    } catch { setMsgs(m => [...m, { role:"ai", text: "Connection failed." }]); }
    setThinking(false);
  }, [msgs, exam, user, anonId, freeUsed, thinking, onNeedAuth]);

  const suggestions = ["Explain the Preamble of Indian Constitution","What is GDP? Explain with examples","Difference between Lok Sabha and Rajya Sabha","What is photosynthesis?"];

  return (
    <div className="chat-wrap" style={{position:"relative"}}>
      <div className="chat-header">
        <div style={{display:"flex",alignItems:"center",gap:8}}><div className="chat-dot" /><span style={{fontSize:14,fontWeight:600}}>Ask AI Tutor</span></div>
        <select className="exam-select" value={exam} onChange={e=>setExam(e.target.value)}>{EXAMS.map(x=><option key={x} value={x}>{x}</option>)}</select>
      </div>
      <div className="chat-msgs" ref={msgsRef}>
        {msgs.length===0 && <div className="suggested"><p style={{fontSize:12,color:"var(--text3)",textAlign:"center",marginBottom:4}}>Suggested questions:</p>{suggestions.map(s=><button key={s} className="sugg-btn" onClick={()=>send(s)}>{s}</button>)}</div>}
        {msgs.map((m,i) => <div key={i} className={m.role==="user" ? "msg-user" : "msg-ai"}>{m.role==="ai" ? renderMarkdown(m.text) : m.text}</div>)}
        {thinking && <div className="msg-thinking"><div className="thinking-dots"><span/><span/><span/></div></div>}
        {!user && freeUsed>=2 && <div className="free-limit">Free limit reached — <button onClick={onNeedAuth}>Sign up free</button> for unlimited AI</div>}
      </div>
      <div className="chat-input-row">
        <input className="chat-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send(input)} placeholder={!user&&freeUsed>=2 ? "Sign up for unlimited access" : "Ask any exam question…"} disabled={thinking||(!user&&freeUsed>=2)} />
        <button className="chat-send" onClick={()=>send(input)} disabled={thinking||!input.trim()||(!user&&freeUsed>=2)}>{thinking?"…":"→"}</button>
      </div>
    </div>
  );
}

// ─── DESKTOP CURRENT AFFAIRS ──────────────────────────────────────────────────
function DesktopCurrentAffairs({ onAskAI }: { onAskAI: (q: string) => void }) {
  const [items, setItems] = useState<CAItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState("UPSC");
  const [cat, setCat] = useState("All");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<CAItem|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch(`${API}/current-affairs/${encodeURIComponent(exam)}?lang=english`); const d = await r.json(); setItems(d.affairs || []); setDate(d.date || ""); }
    catch { setItems([]); }
    setLoading(false);
  }, [exam]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const fn = (e: KeyboardEvent) => { if (e.key==="Escape") setSelected(null); }; window.addEventListener("keydown", fn); return () => window.removeEventListener("keydown", fn); }, []);

  const filtered = cat==="All" ? items : items.filter(x=>x.category===cat);
  const display = [...filtered.filter(x=>x.importance==="high"), ...filtered.filter(x=>x.importance!=="high")].slice(0, 8);

  return (
    <section id="ca">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:32}}>
        <div>
          <div className="section-label">// Current Affairs {date && `· ${date}`}</div>
          <h2>Stay updated,<br/><span>every single day</span></h2>
          <p className="sub">AI-curated news cards tagged by exam relevance — updated daily.</p>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <select className="exam-select" value={exam} onChange={e=>setExam(e.target.value)}>{EXAMS.filter(x=>x!=="General").map(x=><option key={x} value={x}>{x}</option>)}</select>
        </div>
      </div>
      <div className="ca-filters">{CA_CATEGORIES.map(c=><button key={c} className={`ca-filter ${cat===c?"active":""}`} onClick={()=>setCat(c)}>{c}</button>)}</div>
      <div className="ca-items">
        {loading && [1,2,3,4,5,6].map(i=><div key={i} className="skeleton"/>)}
        {!loading && display.length===0 && <div style={{color:"var(--text3)",textAlign:"center",padding:40}}>No articles found. <button style={{background:"none",border:"none",color:"var(--teal)",cursor:"pointer",textDecoration:"underline"}} onClick={load}>Retry</button></div>}
        {!loading && display.map((item,i)=>(
          <div key={i} className="ca-item" onClick={()=>setSelected(item)}>
            <span className="ca-tag">{item.category}</span>
            <div>
              <div className="ca-text">{item.headline}</div>
              {item.summary && <div className="ca-meta">{item.summary.replace(/\s+/g," ").slice(0,130)}…</div>}
              <div className="ca-meta" style={{color:"var(--teal)",marginTop:4}}>{item.examRelevance}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={`drawer-overlay ${selected?"open":""}`} onClick={()=>setSelected(null)} />
      <div className={`news-drawer ${selected?"open":""}`}>
        <div className="drawer-head">
          <span style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"var(--teal)"}}>{selected?.category || "Current Affairs"}</span>
          <button className="drawer-close" onClick={()=>setSelected(null)}>✕</button>
        </div>
        <div className="drawer-body">
          {selected && (<>
            <div style={{fontSize:18,fontWeight:700,lineHeight:1.4,color:"var(--text)",marginBottom:12}}>{selected.headline}</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>{selected.examRelevance?.split(",").map((tag,i)=><span key={i} style={{fontSize:11,padding:"3px 10px",borderRadius:6,background:"var(--teal-dim)",color:"var(--teal)"}}>{tag.trim()}</span>)}</div>
            <div style={{height:1,background:"var(--border)",marginBottom:16}} />
            <div style={{fontSize:14,lineHeight:1.8,color:"var(--text2)",whiteSpace:"pre-line"}}>{selected.content || selected.summary}</div>
          </>)}
        </div>
        <div className="drawer-foot">
          <button className="btn-drawer-ask" onClick={()=>{ if (!selected) return; onAskAI(`Tell me more about this current affairs topic for ${exam}: "${selected.headline}". Explain its background, significance, and exam relevance.`); setSelected(null); document.getElementById("chat")?.scrollIntoView({behavior:"smooth"}); }}>🤖 Ask AI about this</button>
        </div>
      </div>
    </section>
  );
}

// ─── MOBILE AUTH GATE ─────────────────────────────────────────────────────────
function MobileAuthGate({ onOpenAuth, feature }: { onOpenAuth: () => void; feature: string }) {
  return (
    <div className="mobile-auth-gate">
      <div style={{fontSize:52,marginBottom:16}}>🔒</div>
      <div style={{fontFamily:"var(--font-h)",fontSize:20,fontWeight:800,color:"var(--text)",marginBottom:10}}>Sign in to access {feature}</div>
      <p style={{fontSize:14,color:"var(--text2)",lineHeight:1.7,marginBottom:24,maxWidth:280}}>Create a free account to unlock this feature and much more.</p>
      <button className="btn-teal" style={{padding:"14px 32px",fontSize:15}} onClick={onOpenAuth}>Sign Up Free →</button>
      <button className="btn-ghost" style={{marginTop:10,padding:"12px 28px",fontSize:13}} onClick={onOpenAuth}>Already have an account? Log In</button>
    </div>
  );
}

// ─── STATIC DATA (module scope) ───────────────────────────────────────────────
const S = { fill:"none", stroke:"currentColor", strokeWidth:1.6, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
const IconWrap = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width:44, height:44, borderRadius:12, background:"var(--teal-dim)", border:"1px solid var(--border-t)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--teal)", marginBottom:14 }}>
    {children}
  </div>
);

const features = [
  { icon: <svg width="22" height="22" viewBox="0 0 24 24" {...S}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/></svg>, title: "Ask AI Tutor", desc: "Ask anything about your exam — get detailed explanations, mnemonics, and PYQ-style answers instantly." },
  { icon: <svg width="22" height="22" viewBox="0 0 24 24" {...S}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12l3 3 5-5"/></svg>, title: "Mock Tests", desc: "Practice with actual PYQs from UPSC, JEE, NEET, SSC and more. Track your accuracy and weak areas." },
  { icon: <svg width="22" height="22" viewBox="0 0 24 24" {...S}><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>, title: "Current Affairs", desc: "AI-curated daily news with exam relevance tags for focused revision." },
  { icon: <svg width="22" height="22" viewBox="0 0 24 24" {...S}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>, title: "Profile Hub", desc: "Track your coins, streak, leaderboard rank, and notification settings from one place." },
  { icon: <svg width="22" height="22" viewBox="0 0 24 24" {...S}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 4v16M2 12h20M7 8h2M7 16h2M15 8h2M15 16h2"/></svg>, title: "Flashcards", desc: "AI-generated spaced repetition flashcards. Master any topic in record time." },
  { icon: <svg width="22" height="22" viewBox="0 0 24 24" {...S}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="18" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/></svg>, title: "Study Planner", desc: "Personalised study schedules that adapt to your progress and exam date." },
];

const examsDisplay = [
  {ico:"🏛️",name:"UPSC CSE",sub:"Civil Services"},{ico:"⚡",name:"JEE",sub:"Engineering"},
  {ico:"🧬",name:"NEET",sub:"Medical"},{ico:"⚖️",name:"CLAT-UG",sub:"Law Entrance"},
  {ico:"📚",name:"CUET-UG",sub:"University Entrance"},{ico:"🪖",name:"NDA",sub:"Defence"},
  {ico:"🎓",name:"UGC-NET",sub:"JRF / Assistant Professor"},{ico:"🏦",name:"Banking",sub:"IBPS, SBI"},
  {ico:"📋",name:"SSC",sub:"Staff Selection"},{ico:"🚂",name:"Railway",sub:"RRB NTPC"},
  {ico:"📊",name:"CAT",sub:"MBA Entrance"},{ico:"🗺️",name:"State PCS",sub:"State exams"},
];

const testimonials = [
  {text:"ExamAI's current affairs section saved me so much time. The quick revision cards are perfect before mock tests.",name:"Priya Sharma",exam:"UPSC 2024 Qualifier",stars:5},
  {text:"The AI tutor explains JEE concepts better than most YouTube videos. Used it daily for 6 months.",name:"Arjun Mehta",exam:"JEE Advanced 2024",stars:5},
  {text:"Mock tests are spot on. Weak area tracking helped me improve from 60% to 89% accuracy.",name:"Sneha Reddy",exam:"SSC 2024",stars:5},
];

const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
  { id: "news", label: "News", icon: <svg width="22" height="22" viewBox="0 0 24 24" {...S}><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M7 8h10M7 12h10M7 16h6"/></svg> },
  { id: "quiz", label: "Quiz", icon: <svg width="22" height="22" viewBox="0 0 24 24" {...S}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12l3 3 5-5"/></svg> },
  { id: "ai", label: "Ask AI", icon: <svg width="22" height="22" viewBox="0 0 24 24" {...S}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/></svg> },
  { id: "flashcards", label: "Cards", icon: <svg width="22" height="22" viewBox="0 0 24 24" {...S}><rect x="3" y="5" width="14" height="12" rx="2" /><path d="M7 9h6M7 13h4" /><path d="M9 19h10a2 2 0 0 0 2-2V9" /></svg> },
  { id: "profile", label: "Profile", icon: <svg width="22" height="22" viewBox="0 0 24 24" {...S}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg> },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
interface LandingClientProps {
  forceWebApp?: boolean;
}

export default function LandingClient({ forceWebApp = false }: LandingClientProps) {
  // ── Auth from UserContext ──
  const { user: ctxUser, anonId: ctxAnonId, setUser: setCtxUser, logout: ctxLogout, loading: authLoading } = useUser();

  // ── Local state ──
  const [showAuth, setShowAuth] = useState(false);
  const [aiPrefill, setAiPrefill] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("home");
  const [viewMode, setViewMode] = useState<"landing" | "webapp">(forceWebApp ? "webapp" : "landing");
  const [showSplash, setShowSplash] = useState(forceWebApp);
  const [exam, setExam] = useState("UPSC");

  // Cast for local usage (UserContext user compatible)
  const user = ctxUser as UserLocal | null;
  const anonId = ctxAnonId || (typeof window !== "undefined" ? getAnonId() : "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("examai_exam");
    if (saved) setExam(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.exam) return;
    const saved = localStorage.getItem("examai_exam");
    if (!saved) setExam(user.exam);
  }, [user?.exam]);

  const saveExamPreference = useCallback((nextExam: string, nextUser: UserLocal | null = user) => {
    setExam(nextExam);
    if (typeof window !== "undefined") localStorage.setItem("examai_exam", nextExam);
    if (nextUser) {
      setCtxUser({ ...nextUser, exam: nextExam } as unknown as typeof ctxUser);
    }
  }, [ctxUser, setCtxUser, user]);

  const logout = () => {
    setMobileTab("news");
    ctxLogout();
  };

  const handleLogin = (u: UserLocal) => {
    setCtxUser(u as unknown as typeof ctxUser);
    saveExamPreference(u.exam || "UPSC", u);
    setShowAuth(false);
  };

  const openWebApp = () => {
    if (typeof window !== "undefined") window.location.href = "/webapp";
  };

  const openLanding = () => {
    if (forceWebApp) {
      if (typeof window !== "undefined") window.location.href = "/";
      return;
    }
    setViewMode("landing");
    setMobileTab("home");
    setShowSplash(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSplashDone = () => {
    setShowSplash(false);
  };

  const openProfile = () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setShowSplash(false);
    setViewMode("webapp");
    setMobileTab("profile");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToChat = () => { if (window.innerWidth <= 768) setMobileTab("ai"); else document.getElementById("chat")?.scrollIntoView({behavior:"smooth"}); };
  const goToQuiz = () => { if (window.innerWidth <= 768) setMobileTab("quiz"); else document.getElementById("quiz")?.scrollIntoView({behavior:"smooth"}); };

  // Avoid auth hydration flicker in app shell
  if (authLoading && viewMode === "webapp") {
    return (
      <>
        <style>{css}</style>
        <div style={{ minHeight: "100vh", background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}>
          Loading...
        </div>
      </>
    );
  }

  return (
    <div className={viewMode === "webapp" ? "webapp-shell" : undefined}>
      <style>{css}</style>
      <h1 className="seo-h">ExamAI — AI Tutor for UPSC, JEE, NEET, SSC, Banking Exams in India</h1>

      {showSplash && <SplashScreen onDone={handleSplashDone} />}

      {/* ── DESKTOP NAV (landing only) ── */}
      {viewMode === "landing" && (
        <nav className="desktop-nav">
          <div className="logo">Exam<span>AI</span></div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#quiz" onClick={e=>{ e.preventDefault(); goToQuiz(); }}>Mock Test</a>
            <a href="#ca">Current Affairs</a>
            <a href="#exams">Exams</a>
            <a href="#chat">Ask AI</a>
          </div>
          <div className="nav-right">
            <a className="btn-ghost" href={PLAYSTORE_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>Play Store</a>
            <button className="btn-teal" onClick={openWebApp}>Open Web App →</button>
            {user
              ? <ProfileIconButton user={user} onClick={openProfile} />
              : <button className="btn-ghost" onClick={()=>setShowAuth(true)}>Login</button>}
          </div>
        </nav>
      )}

      {/* ── MOBILE TOP BAR ── */}
      <div className="mobile-topbar">
        <div className="logo" style={{ cursor: forceWebApp ? "default" : "pointer" }} onClick={() => { if (!forceWebApp) openLanding(); }}>Exam<span>AI</span></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {viewMode === "landing" ? (
            <>
              <a className="btn-ghost" href={PLAYSTORE_URL} target="_blank" rel="noopener noreferrer" style={{padding:"6px 12px",fontSize:12,textDecoration:"none"}}>Play</a>
              <button className="btn-teal" style={{padding:"7px 12px",fontSize:12}} onClick={openWebApp}>Web App</button>
              {user && <ProfileIconButton user={user} onClick={openProfile} compact />}
            </>
          ) : (
            <>
              {!forceWebApp && <button className="btn-ghost" style={{padding:"6px 10px",fontSize:12}} onClick={openLanding}>← Home</button>}
              {user
                ? <ProfileIconButton user={user} onClick={openProfile} compact />
                : (<button className="btn-teal" style={{padding:"7px 12px",fontSize:12}} onClick={()=>setShowAuth(true)}>Login</button>)}
            </>
          )}
        </div>
      </div>

      {/* ── PAGE WRAPPER ── */}
      <div className="page-wrapper">

        {/* ══ LANDING PAGE ══ */}
        {viewMode === "landing" && (
        <div className={`mobile-section ${mobileTab==="home"?"active":""}`} id="home-section">
          {/* HERO */}
          <div className="hero">
            <div>
              <div className="hero-badge">🎯 Trusted by 50,000+ students</div>
              <h1>Don&apos;t Just Study<br/><span>Let AI Build Your Career</span></h1>
              <p>Ask AI tutors, take PYQ mock tests, read daily current affairs, and revise faster with flashcards built for serious aspirants.</p>
              <div className="hero-btns">
                <a className="btn-teal" href="https://go.examai-in.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>Download App ↗</a>
                <button className="btn-ghost" onClick={openWebApp}>Go To Web App</button>
                {!user && <button className="btn-ghost" onClick={()=>setShowAuth(true)}>Login</button>}
              </div>
              <div className="stats-row">
                <div className="stat"><span className="stat-n">50K+</span><span className="stat-l">Students</span></div>
                <div className="stat"><span className="stat-n">1M+</span><span className="stat-l">Questions</span></div>
                <div className="stat"><span className="stat-n">20+</span><span className="stat-l">Exam categories</span></div>
                <div className="stat"><span className="stat-n">4.8★</span><span className="stat-l">Play Store</span></div>
              </div>
            </div>
            <div className="hero-right" id="chat">
              <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:20,overflow:"hidden",boxShadow:"0 40px 80px #E0E0E0"}}>
                <div style={{background:"var(--navy2)",padding:"10px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{display:"flex",gap:5}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:"#ff5f57"}}/>
                    <div style={{width:10,height:10,borderRadius:"50%",background:"#ffbd2e"}}/>
                    <div style={{width:10,height:10,borderRadius:"50%",background:"var(--teal)"}}/>
                  </div>
                  <span style={{fontSize:12,color:"var(--text3)"}}>🔒 examai-in.com/chat</span>
                </div>
                <div style={{padding:16}}>
                  <HeroChat user={user} anonId={anonId} onNeedAuth={()=>setShowAuth(true)} prefill={aiPrefill} onPrefillConsumed={()=>setAiPrefill("")} />
                </div>
              </div>
            </div>
          </div>

          {/* FEATURES — desktop only */}
          <section id="features" className="desktop-only" style={{background:`linear-gradient(180deg,var(--navy) 0%,var(--navy2) 100%)`}}>
            <div className="section-label">// What we offer</div>
            <h2>Everything you need to<br/><span>crack your exam</span></h2>
            <div className="feat-grid">
              {features.map(f => (
                <div key={f.title} className="feat-card">
                  <IconWrap>{f.icon}</IconWrap>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* MOCK TEST — desktop only */}
          <section id="quiz" className="desktop-only" style={{background:"var(--navy2)"}}>
            <div className="section-label">// Mock Test</div>
            <h2>Daily <span>Quiz</span></h2>
            <p className="sub">Practice PYQs and track your progress.</p>
            <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:20,padding:24,textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:16}}>📝</div>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Unlimited Free Questions</div>
              <div style={{fontSize:13,color:"var(--text2)",marginBottom:20}}>Practice questions for UPSC, JEE, NEET and more.</div>
              <button className="btn-teal" onClick={()=>setShowAuth(true)}>Sign Up to Practice →</button>
            </div>
          </section>

          <div className="desktop-only"><DesktopCurrentAffairs onAskAI={(q)=>setAiPrefill(q)} /></div>

          <section id="exams" style={{background:"var(--navy2)"}}>
            <div className="section-label">// Exam coverage</div>
            <h2>Prepared for<br/><span>every major exam</span></h2>
            <div className="exam-grid">
              {examsDisplay.map(e=>(
                <div key={e.name} className="exam-card" onClick={()=>setShowAuth(true)}>
                  <div className="ico">{e.ico}</div>
                  <div className="name">{e.name}</div>
                  <div className="sub">{e.sub}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="desktop-only">
            <div className="section-label">// Student stories</div>
            <h2>Loved by<br/><span>serious aspirants</span></h2>
            <div className="testi-grid">
              {testimonials.map(t=>(
                <div key={t.name} className="testi-card">
                  <div className="stars">{"★".repeat(t.stars)}</div>
                  <div className="testi-text">&ldquo;{t.text}&rdquo;</div>
                  <div className="testi-name">{t.name}</div>
                  <div className="testi-exam">{t.exam}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="cta-box">
              <h2>Ready to crack your exam?</h2>
              <p>Download the mobile app or continue instantly in the web app with Ask AI, Mock Tests, News, Flashcards, and your study profile.</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a className="btn-teal" href="https://go.examai-in.com" target="_blank" rel="noopener noreferrer" style={{fontSize:16,padding:"16px 32px", textDecoration: "none"}}>Download on Play Store ↗</a>
                <button className="btn-ghost" style={{fontSize:16,padding:"16px 32px"}} onClick={openWebApp}>Open Web App</button>
              </div>
            </div>
          </section>

          <footer>
            <div className="logo" style={{marginBottom:12}}>Exam<span>AI</span></div>
            <p>© 2025 ExamAI · Built for India&apos;s exam warriors</p>
            <p style={{marginTop:8}}><a href="https://examai-in.com" style={{color:"var(--teal)",textDecoration:"none"}}>examai-in.com</a></p>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", fontSize: 12 }}>
              <a href="/privacy-policy" style={{ color: "var(--text2)", textDecoration: "none" }}>Privacy Policy</a>
              <a href="/delete-account" style={{ color: "var(--text2)", textDecoration: "none" }}>Delete Account</a>
            </div>
          </footer>
        </div>
        )}

        {/* ══ WEB APP TABS ══ */}
        {viewMode === "webapp" && (
        <>
        <div className={`mobile-section ${mobileTab==="news"?"active":""}`}>
          <CurrentAffairsScreen
            exam={exam}
            API_URL={API}
          />
        </div>

        {/* ══ QUIZ TAB (mobile) — auth protected ══ */}
        <div className={`mobile-section ${mobileTab==="quiz"?"active":""}`}
          style={{ display: mobileTab==="quiz" ? "flex" : "none", flexDirection:"column", height:"calc(100vh - 56px - var(--bottom-bar-h))" }}>
          {user ? (
            <MockTestScreen exam={exam} API_URL={API} userId={user.uid} />
          ) : (
            <MobileAuthGate onOpenAuth={()=>setShowAuth(true)} feature="Mock Tests" />
          )}
        </div>

        {/* ══ ASK AI TAB (mobile) ══ */}
        <div className={`mobile-section ${mobileTab==="ai"?"active":""}`}
          style={{ display: mobileTab==="ai" ? "flex" : "none", flexDirection:"column", height:"calc(100vh - 56px - var(--bottom-bar-h))" }}>
          <AskAIScreen
            exam={exam}
            API_URL={API}
            userId={user?.uid}
            anonId={anonId}
            initialPrompt={aiPrefill}
            onPromptUsed={()=>setAiPrefill("")}
          />
        </div>

        {/* ══ FLASHCARDS TAB (mobile) — auth protected ══ */}
        <div className={`mobile-section ${mobileTab==="flashcards"?"active":""}`}
          style={{ display: mobileTab==="flashcards" ? "flex" : "none", flexDirection:"column", height:"calc(100vh - 56px - var(--bottom-bar-h))" }}>
          {user ? (
            <FlashcardsScreen API_URL={API} userId={user.uid} exam={exam} />
          ) : (
            <MobileAuthGate onOpenAuth={()=>setShowAuth(true)} feature="Flashcards" />
          )}
        </div>

        {/* ══ PROFILE TAB (mobile) — auth protected ══ */}
        <div className={`mobile-section ${mobileTab==="profile"?"active":""}`}
          style={{ display: mobileTab==="profile" ? "flex" : "none", flexDirection:"column", height:"calc(100vh - 56px - var(--bottom-bar-h))" }}>
          {user ? (
            <ProfileScreen
              API_URL={API}
              user={user}
              exam={exam}
              exams={EXAMS.filter(x => x !== "General")}
              onExamChange={(nextExam) => saveExamPreference(nextExam)}
              onLogout={logout}
            />
          ) : (
            <MobileAuthGate onOpenAuth={()=>setShowAuth(true)} feature="Profile" />
          )}
        </div>
        </>
        )}

      </div>

      {/* ── BOTTOM TAB BAR (web app mode) ── */}
      {viewMode === "webapp" && (
        <div className="bottom-tab-bar">
          <div className="tab-bar-inner">
            {tabs.filter(t=>t.id!=="ai").slice(0,2).map(t=>(
              <button key={t.id} className={`tab-item ${mobileTab===t.id?"active":""}`} onClick={()=>setMobileTab(t.id)}>
                <div className="tab-icon">{t.icon}</div>
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
            <button className={`tab-ai ${mobileTab==="ai"?"active":""}`} onClick={()=>setMobileTab("ai")}>
              {tabs.find(t=>t.id==="ai")?.icon}
            </button>
            {tabs.filter(t=>t.id!=="ai").slice(2).map(t=>(
              <button key={t.id} className={`tab-item ${mobileTab===t.id?"active":""}`} onClick={()=>setMobileTab(t.id)}>
                <div className="tab-icon">{t.icon}</div>
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── AUTH MODAL ── */}
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onLogin={handleLogin} />}
    </div>
  );
}
