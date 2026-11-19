import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { type ProfileRow } from "@/lib/supabase/types";
import { type User, type Session } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  profile: ProfileRow | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
}

export const authService = {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  async getSession(): Promise<Session | null> {
    const supabase = getBrowserSupabase();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (err) {
      console.warn("AuthService.getSession error:", err);
      return null;
    }
  },

  async getUser(): Promise<User | null> {
    const supabase = getBrowserSupabase();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    } catch (err) {
      console.warn("AuthService.getUser error:", err);
      return null;
    }
  },

  async getProfile(userId: string): Promise<ProfileRow | null> {
    const supabase = getBrowserSupabase();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) {
        // If profile doesn't exist yet, return null
        return null;
      }
      return data as ProfileRow;
    } catch (err) {
      console.warn("AuthService.getProfile error:", err);
      return null;
    }
  },

  async signUp(email: string, password: string, fullName: string) {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      throw new Error("Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role_title: "Personal vault",
        },
      },
    });

    if (error) throw error;

    // Ensure profile row exists
    if (data.user) {
      await (supabase.from("profiles") as any).upsert({
        id: data.user.id,
        full_name: fullName,
        email: email,
        role_title: "Personal vault",
      });
    }

    return data;
  },

  async signIn(email: string, password: string) {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      throw new Error("Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      throw new Error("Supabase is not configured. Please add credentials to .env.local");
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}?tab=settings` : undefined,
    });

    if (error) throw error;
  },

  async updateProfile(userId: string, updates: Partial<ProfileRow>): Promise<ProfileRow | null> {
    const supabase = getBrowserSupabase();
    if (!supabase) return null;

    const { data, error } = await (supabase.from("profiles") as any)
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data as ProfileRow;
  },

  onAuthStateChange(callback: (session: Session | null, user: User | null) => void) {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      return () => {};
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session, session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  },
};
