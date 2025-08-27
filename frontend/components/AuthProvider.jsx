"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getProfile, clearProfile } from "../lib/api";
import { useRouter } from "next/navigation";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const me = await getProfile();
        if (mounted) setUser(me);
      } catch (e) {
        // ignore; user may be unauthenticated or throttled
        if (mounted) setUser(null);
        setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      clearProfile();
      const me = await getProfile(true);
      setUser(me);
      setError(null);
      return me;
    } catch (e) {
      setUser(null);
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } catch (e) {}
    clearProfile();
    setUser(null);
    router.replace("/login");
    window.dispatchEvent(new Event("auth:changed"));
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthProvider;
