"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface User {
  uid: string;
  name: string;
  email: string;
  exam: string;
}

interface UserContextValue {
  user: User | null;
  anonId: string;
  setUser: (u: User | null) => void;
  logout: () => void;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  anonId: "",
  setUser: () => {},
  logout: () => {},
  loading: true,
});

function getAnonId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("examai_anon");
  if (!id) {
    id = `anon_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("examai_anon", id);
  }
  return id;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [anonId, setAnonId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAnonId(getAnonId());
    try {
      const s = localStorage.getItem("examai_user");
      if (s) setUserState(JSON.parse(s));
    } catch {}
    setLoading(false);
  }, []);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) localStorage.setItem("examai_user", JSON.stringify(u));
    else localStorage.removeItem("examai_user");
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    localStorage.removeItem("examai_user");
  }, []);

  return (
    <UserContext.Provider value={{ user, anonId, setUser, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}