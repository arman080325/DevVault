"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Sync mode with prop changes when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg(null);
      setFieldErrors({});
      setSuccessMsg(null);
      setRequiresVerification(false);
    }
  }, [isOpen, initialMode]);

  // Focus on first input
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const isConfigured = authService.isConfigured();

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (mode !== "reset") {
      if (!password) {
        errors.password = "Password is required.";
      } else if (password.length < 6) {
        errors.password = "Password must be at least 6 characters.";
      }
    }

    if (mode === "sign-up") {
      if (!fullName.trim()) {
        errors.fullName = "Full name is required.";
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setRequiresVerification(false);

    if (!validateForm()) {
      return;
    }

    if (!isConfigured) {
      setErrorMsg(
        "Supabase credentials pending in .env.local. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to activate cloud sync."
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === "sign-in") {
        await authService.signIn(email.trim(), password);

        setSuccessMsg("Welcome back to your vault!");
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 700);
      } else if (mode === "sign-up") {
        const data = await authService.signUp(email.trim(), password, fullName.trim());

        // Check if email confirmation is required by Supabase
        if (data.user && (!data.session || data.user.identities?.length === 0)) {
          setRequiresVerification(true);
          setSuccessMsg(
            `Account created for ${email}. Please check your email inbox to verify your address before signing in.`
          );
        } else {
          setSuccessMsg("Account created! Synchronizing your personal vault...");
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 1000);
        }
      } else if (mode === "reset") {
        await authService.resetPassword(email.trim());
        setSuccessMsg(`Recovery link sent to ${email.trim()}. Please check your inbox.`);
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      let friendly = raw;

      if (raw.toLowerCase().includes("invalid login credentials")) {
        friendly = "Invalid email or password. Please verify your details.";
      } else if (raw.toLowerCase().includes("user already registered")) {
        friendly = "An account with this email already exists. Try signing in.";
      } else if (raw.toLowerCase().includes("email not confirmed")) {
        friendly = "Please confirm your email address before signing in. Check your inbox for the activation link.";
      } else if (raw.toLowerCase().includes("rate limit")) {
        friendly = "Too many attempts. Please wait a few moments before trying again.";
      }

      setErrorMsg(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-sm animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={loading ? undefined : onClose} />

      {/* Modal Surface */}
      <div className="relative w-full max-w-[440px] my-auto bg-[var(--surface,#fcfbf8)] dark:bg-[var(--surface,#141311)] border border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] rounded-2xl p-6 sm:p-8 shadow-2xl z-10 transition-all select-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 text-[var(--muted,#7c7468)] hover:text-[var(--foreground,#211d18)] dark:hover:text-[#eee8df] p-1.5 rounded-lg transition-colors disabled:opacity-40"
          aria-label="Close authentication dialog"
        >
          <Icon name="x" size={18} />
        </button>

        {/* Brand & Heading */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="scale-105 mb-3">
            <Brand />
          </div>
          <h2
            id="auth-modal-title"
            className="font-serif text-2xl sm:text-[26px] font-normal text-[var(--foreground,#211d18)] dark:text-[#F5F1E9] tracking-tight mt-1"
          >
            {mode === "sign-in" && "Sign in to your vault"}
            {mode === "sign-up" && "Create your personal vault"}
            {mode === "reset" && "Reset your password"}
          </h2>
          <p className="text-xs sm:text-[13.5px] text-[var(--muted,#7c7468)] dark:text-[#a39a8c] mt-1.5 max-w-xs leading-relaxed">
            {mode === "sign-in" && "Synchronize resources, collections and reading progress across all your devices."}
            {mode === "sign-up" && "A tactile, focused knowledge repository engineered for developer discoveries."}
            {mode === "reset" && "Enter your email address and we'll send a password recovery link."}
          </p>
        </div>

        {/* Configuration Notice if not set */}
        {!isConfigured && (
          <div className="mb-5 p-3.5 rounded-xl bg-[var(--accent,#b85d39)]/10 border border-[var(--accent,#b85d39)]/25 text-xs text-[var(--accent,#b85d39)] leading-relaxed">
            <div className="font-semibold flex items-center gap-1.5 mb-1">
              <Icon name="info" size={14} /> Local Mode Active
            </div>
            Supabase credentials not yet detected in <code>.env.local</code>. DevVault is running securely in offline local browser mode.
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div
            className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-600 dark:text-red-400 leading-relaxed flex items-start gap-2.5 animate-shake"
            role="alert"
          >
            <Icon name="info" size={15} className="mt-0.5 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div
            className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed flex items-start gap-2.5"
            role="status"
          >
            <Icon name="check" size={15} className="mt-0.5 shrink-0" />
            <div>
              <span className="font-medium">{successMsg}</span>
              {requiresVerification && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("sign-in");
                      setSuccessMsg(null);
                      setRequiresVerification(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 transition-colors"
                  >
                    Proceed to Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Authentication Form */}
        {!requiresVerification && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* FULL NAME (Sign-Up only) */}
            {mode === "sign-up" && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-[11.5px] font-semibold text-[var(--muted,#7c7468)] uppercase tracking-wider mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <input
                    ref={firstInputRef}
                    id="auth-fullname"
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.fullName) {
                        setFieldErrors((prev) => ({ ...prev, fullName: "" }));
                      }
                    }}
                    placeholder="Alex Lin"
                    className={`w-full px-3.5 py-2.5 rounded-xl border ${
                      fieldErrors.fullName
                        ? "border-red-400 focus:ring-red-400/30"
                        : "border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] focus:ring-[var(--accent,#b85d39)]/30 focus:border-[var(--accent,#b85d39)]"
                    } bg-[var(--surface,#fcfbf8)] dark:bg-[var(--surface,#1a1815)] text-[var(--foreground,#211d18)] dark:text-[#eee8df] text-[15px] focus:outline-none focus:ring-2 transition-all`}
                  />
                </div>
                {fieldErrors.fullName && (
                  <p className="text-[11.5px] text-red-500 mt-1">{fieldErrors.fullName}</p>
                )}
              </div>
            )}

            {/* EMAIL */}
            <div>
              <label
                htmlFor="auth-email"
                className="block text-[11.5px] font-semibold text-[var(--muted,#7c7468)] uppercase tracking-wider mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  ref={mode === "sign-in" || mode === "reset" ? firstInputRef : undefined}
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: "" }));
                    }
                  }}
                  placeholder="alex@devvault.app"
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    fieldErrors.email
                      ? "border-red-400 focus:ring-red-400/30"
                      : "border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] focus:ring-[var(--accent,#b85d39)]/30 focus:border-[var(--accent,#b85d39)]"
                  } bg-[var(--surface,#fcfbf8)] dark:bg-[var(--surface,#1a1815)] text-[var(--foreground,#211d18)] dark:text-[#eee8df] text-[15px] focus:outline-none focus:ring-2 transition-all`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11.5px] text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* PASSWORD */}
            {mode !== "reset" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="auth-password"
                    className="text-[11.5px] font-semibold text-[var(--muted,#7c7468)] uppercase tracking-wider"
                  >
                    Password
                  </label>
                  {mode === "sign-in" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("reset");
                        setErrorMsg(null);
                        setFieldErrors({});
                        setSuccessMsg(null);
                      }}
                      className="text-xs text-[var(--accent,#b85d39)] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: "" }));
                      }
                    }}
                    placeholder={mode === "sign-up" ? "Minimum 6 characters" : "••••••••"}
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border ${
                      fieldErrors.password
                        ? "border-red-400 focus:ring-red-400/30"
                        : "border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] focus:ring-[var(--accent,#b85d39)]/30 focus:border-[var(--accent,#b85d39)]"
                    } bg-[var(--surface,#fcfbf8)] dark:bg-[var(--surface,#1a1815)] text-[var(--foreground,#211d18)] dark:text-[#eee8df] text-[15px] focus:outline-none focus:ring-2 transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted,#7c7468)] hover:text-[var(--foreground,#211d18)] p-1 rounded transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPassword ? "eye-off" : "eye"} size={16} />
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11.5px] text-red-500 mt-1">{fieldErrors.password}</p>
                )}
              </div>
            )}

            {/* CONFIRM PASSWORD (Sign-Up only) */}
            {mode === "sign-up" && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-[11.5px] font-semibold text-[var(--muted,#7c7468)] uppercase tracking-wider mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                      }
                    }}
                    placeholder="Repeat your password"
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border ${
                      fieldErrors.confirmPassword
                        ? "border-red-400 focus:ring-red-400/30"
                        : "border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] focus:ring-[var(--accent,#b85d39)]/30 focus:border-[var(--accent,#b85d39)]"
                    } bg-[var(--surface,#fcfbf8)] dark:bg-[var(--surface,#1a1815)] text-[var(--foreground,#211d18)] dark:text-[#eee8df] text-[15px] focus:outline-none focus:ring-2 transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted,#7c7468)] hover:text-[var(--foreground,#211d18)] p-1 rounded transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showConfirmPassword ? "eye-off" : "eye"} size={16} />
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-[11.5px] text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* REMEMBER ME (Sign-In only) */}
            {mode === "sign-in" && (
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  id="auth-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--accent,#b85d39)] focus:ring-[var(--accent,#b85d39)] border-[var(--border,#e4dfd5)] accent-[var(--accent,#b85d39)]"
                />
                <label
                  htmlFor="auth-remember"
                  className="text-xs text-[var(--muted,#7c7468)] dark:text-[#a39a8c] cursor-pointer"
                >
                  Keep me signed in on this device
                </label>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent,#b85d39)] hover:bg-[#a04e2d] text-white font-medium text-sm transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {mode === "sign-in"
                      ? "Verifying..."
                      : mode === "sign-up"
                      ? "Creating Vault..."
                      : "Sending link..."}
                  </span>
                </>
              ) : mode === "sign-in" ? (
                <>
                  <Icon name="log-in" size={16} />
                  <span>Sign In to Vault</span>
                </>
              ) : mode === "sign-up" ? (
                <>
                  <Icon name="lock" size={16} />
                  <span>Create My Vault</span>
                </>
              ) : (
                <>
                  <Icon name="arrow" size={16} />
                  <span>Send Recovery Link</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Mode Switcher */}
        <div className="mt-6 pt-5 border-t border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] text-center text-xs text-[var(--muted,#7c7468)]">
          {mode === "sign-in" && (
            <p>
              Don&apos;t have a vault yet?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("sign-up");
                  setErrorMsg(null);
                  setFieldErrors({});
                  setSuccessMsg(null);
                }}
                className="font-semibold text-[var(--foreground,#211d18)] dark:text-[#eee8df] hover:text-[var(--accent,#b85d39)] transition-colors underline ml-1"
              >
                Create an account
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
                  setFieldErrors({});
                  setSuccessMsg(null);
                }}
                className="font-semibold text-[var(--foreground,#211d18)] dark:text-[#eee8df] hover:text-[var(--accent,#b85d39)] transition-colors underline ml-1"
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
                  setFieldErrors({});
                  setSuccessMsg(null);
                }}
                className="font-semibold text-[var(--foreground,#211d18)] dark:text-[#eee8df] hover:text-[var(--accent,#b85d39)] transition-colors underline ml-1"
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
