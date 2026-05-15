import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { User } from "@supabase/supabase-js";
import type { AuthUser } from "@/types";

async function fetchProfile(userId: string) {
  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

function mapUser(user: User, profile: Record<string, unknown> | null): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    username:
      (profile?.username as string) ||
      user.user_metadata?.username ||
      user.email!.split("@")[0],
    full_name:
      (profile?.full_name as string) ||
      user.user_metadata?.full_name ||
      null,
    avatar_url:
      (profile?.avatar_url as string) ||
      user.user_metadata?.avatar_url ||
      null,
    role: (profile?.role as AuthUser["role"]) || "student",
    points: (profile?.points as number) || 0,
    team_id: (profile?.team_id as string) || null,
  };
}

export function useAuth() {
  const { user, loading, login, logout, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (mounted && session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (mounted) login(mapUser(session.user, profile));
      }
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session?.user) {
        const profile = await fetchProfile(session.user.id);
        login(mapUser(session.user, profile));
        setLoading(false);
      } else if (event === "SIGNED_OUT") {
        logout();
        setLoading(false);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        const profile = await fetchProfile(session.user.id);
        login(mapUser(session.user, profile));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const sendOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  };

  const verifyOtpAndRegister = async (
    email: string,
    token: string,
    password: string,
    fullName: string
  ) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) throw error;

    const { data: updateData, error: updateError } =
      await supabase.auth.updateUser({
        password,
        data: { full_name: fullName, username: email.split("@")[0] },
      });
    if (updateError) throw updateError;

    if (updateData.user) {
      await supabase.from("user_profiles").upsert({
        id: updateData.user.id,
        email: updateData.user.email!,
        username: email.split("@")[0],
        full_name: fullName,
        role: "student",
        points: 0,
      });
    }
    return updateData.user;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    logout();
  };

  return { user, loading, sendOtp, verifyOtpAndRegister, signIn, signOut };
}
