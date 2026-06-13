import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { schedulePushRegistration, clearPushRegistration } from "../services/pushNotifications";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileUserIdRef = useRef(null);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, is_admin, phone")
        .eq("id", userId)
        .maybeSingle();
      if (!error) setProfile(data);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const syncAuth = (s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      syncAuth(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      syncAuth(s);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load profile outside the auth listener — calling supabase.from() inside
  // onAuthStateChange can re-trigger auth events and cause a refresh loop.
  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      profileUserIdRef.current = null;
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    if (profileUserIdRef.current === userId) return;
    profileUserIdRef.current = userId;
    fetchProfile(userId);
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    if (user?.id && session?.access_token) {
      schedulePushRegistration(session.access_token);
    }
  }, [user?.id, session?.access_token]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      profileUserIdRef.current = null;
      await fetchProfile(user.id);
      profileUserIdRef.current = user.id;
    }
  }, [user?.id, fetchProfile]);

  const signOut = useCallback(async () => {
    const token = session?.access_token;
    profileUserIdRef.current = null;
    setUser(null);
    setSession(null);
    setProfile(null);
    setProfileLoading(false);

    try {
      if (token) await clearPushRegistration(token);
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Supabase signOut error:", err);
    }
  }, [session?.access_token]);

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, profileLoading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
