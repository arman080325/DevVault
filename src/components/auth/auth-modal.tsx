"use client";

import React, { useState } from "react";
import { Brand } from "@/components/layout/brand";
import { Icon } from "@/components/shared/icon";
import { authService } from "@/services/auth-service";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: "sign-in" | "sign-up";
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "sign-in",
}: AuthModalProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "reset">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfigured = authService.isConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isConfigured) {
      setErrorMsg(
        "Supabase credentials pending in .env.local. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to connect your live database."
      );
      return;
    }

    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (mode !== "reset" && (!password || password.length < 6)) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (mode === "sign-up" && !fullName.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "sign-in") {
        await authService.signIn(email, password);
        setSuccessMsg("Welcome back to your vault!");
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 600);
      } else if (mode === "sign-up") {
        await authService.signUp(email, password, fullName.trim());
        setSuccessMsg("Account created! Check your email if verification is enabled.");
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } else if (mode === "reset") {
        await authService.resetPassword(email);
        setSuccessMsg("Password reset email sent. Check your inbox.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[var(--surface,#fcfbf8)] dark:bg-[var(--surface,#141311)] border border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] rounded-2xl p-7 shadow-2xl overflow-hidden z-10 transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[var(--muted,#7c7468)] hover:text-[var(--foreground,#211d18)] dark:hover:text-[#eee8df] p-1.5 rounded-lg transition-colors"
          aria-label="Close dialog"
        >
          <Icon name="x" size={18} />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="scale-110 mb-3">
            <Brand />
          </div>
          <h2
            id="auth-modal-title"
            className="font-serif text-2xl font-normal text-[var(--foreground,#211d18)] dark:text-[#f4f0e8] tracking-tight mt-1"
          >
            {mode === "sign-in" && "Welcome to DevVault"}
            {mode === "sign-up" && "Create your personal vault"}
            {mode === "reset" && "Reset your password"}
          </h2>
          <p className="text-sm text-[var(--muted,#7c7468)] dark:text-[#a39a8c] mt-1 max-w-xs leading-relaxed">
            {mode === "sign-in" && "Sign in to synchronize your collected resources and shelves across devices."}
            {mode === "sign-up" && "A focused knowledge management vault crafted for intentional developers."}
            {mode === "reset" && "Enter your email address and we'll send a recovery link."}
          </p>
        </div>

        {/* Configuration Notice if not set */}
        {!isConfigured && (
          <div className="mb-5 p-3 rounded-xl bg-[var(--accent,#b85d39)]/10 border border-[var(--accent,#b85d39)]/25 text-xs text-[var(--accent,#b85d39)] leading-relaxed">
            <div className="font-semibold flex items-center gap-1.5 mb-0.5">
              <Icon name="info" size={14} /> Local / Demo Mode Active
            </div>
            To enable cloud persistence, copy <code>.env.example</code> to <code>.env.local</code> and provide your Supabase URL & Anon Key.
          </div>
        )}

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-600 dark:text-red-400 leading-relaxed flex items-start gap-2">
            <Icon name="info" size={14} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed flex items-start gap-2">
            <Icon name="check" size={14} className="mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "sign-up" && (
            <div>
              <label className="block text-xs font-medium text-[var(--muted,#7c7468)] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Lin"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] bg-[var(--surface,#fcfbf8)] dark:bg-[var(--surface,#1a1815)] text-[var(--foreground,#211d18)] dark:text-[#eee8df] text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--accent,#b85d39)]/30 focus:border-[var(--accent,#b85d39)] transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--muted,#7c7468)] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@devvault.app"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] bg-[var(--surface,#fcfbf8)] dark:bg-[var(--surface,#1a1815)] text-[var(--foreground,#211d18)] dark:text-[#eee8df] text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--accent,#b85d39)]/30 focus:border-[var(--accent,#b85d39)] transition-all"
            />
          </div>

          {mode !== "reset" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--muted,#7c7468)] uppercase tracking-wider">
                  Password
                </label>
                {mode === "sign-in" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-[var(--accent,#b85d39)] hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] bg-[var(--surface,#fcfbf8)] dark:bg-[var(--surface,#1a1815)] text-[var(--foreground,#211d18)] dark:text-[#eee8df] text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--accent,#b85d39)]/30 focus:border-[var(--accent,#b85d39)] transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent,#b85d39)] hover:bg-[#a04e2d] text-white font-medium text-sm transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === "sign-in" ? (
              "Sign In to Vault"
            ) : mode === "sign-up" ? (
              "Create My Vault"
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        {/* Footer Mode Switcher */}
        <div className="mt-6 pt-5 border-t border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] text-center text-xs text-[var(--muted,#7c7468)]">
          {mode === "sign-in" && (
            <p>
              Don&apos;t have an account yet?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("sign-up");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="font-semibold text-[var(--foreground,#211d18)] dark:text-[#eee8df] hover:text-[var(--accent,#b85d39)] transition-colors underline"
              >
                Sign up
              </button>
            </p>
          )}

          {mode === "sign-up" && (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("sign-in");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="font-semibold text-[var(--foreground,#211d18)] dark:text-[#eee8df] hover:text-[var(--accent,#b85d39)] transition-colors underline"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === "reset" && (
            <p>
              Remember your password?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("sign-in");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="font-semibold text-[var(--foreground,#211d18)] dark:text-[#eee8df] hover:text-[var(--accent,#b85d39)] transition-colors underline"
              >
                Back to Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
