"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, CheckCircle2 } from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useRouter, usePathname } from "next/navigation";

interface AuthFormInputProps {
  name: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ComponentType<{ className?: string }>;
  onIconClick?: () => void;
}

const fieldTransition = { type: "spring", stiffness: 360, damping: 30 };

const AuthFormInput = ({
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  icon: Icon,
  onIconClick,
}: AuthFormInputProps) => (
  <motion.div
    layout
    transition={fieldTransition}
    className="relative"
  >
    <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
    <input
      id={name}
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="auth-input pl-11 pr-11"
      required
    />
    {onIconClick && (
      <button
        type="button"
        onClick={onIconClick}
        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-soft)] hover:bg-white/5 hover:text-[var(--text-primary)]"
      >
        {type === "password" ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </button>
    )}
  </motion.div>
);

export function AppleAuth() {
  const { login, loginWithGoogle, signup, signupWithGoogle } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname !== "/signup";
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    password: "",
    confirmPassword: "",
    userLevel: "participant",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      let authSuccess = false;
      if (isLogin) {
        authSuccess = await login(
          formData.email,
          formData.password,
          formData.userLevel
        );
      } else {
        authSuccess = await signup(
          formData.userName,
          formData.email,
          formData.password
        );
      }

      if (authSuccess) {
        setSuccess(
          isLogin ? "Login successful." : "Account created successfully."
        );
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        setError(isLogin ? "Invalid credentials." : "Could not create account.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      let authSuccess = false;
      if (isLogin) {
        authSuccess = await loginWithGoogle(formData.userLevel);
      } else {
        authSuccess = await signupWithGoogle();
      }

      if (authSuccess) {
        setSuccess(
          isLogin ? "Login successful." : "Account created successfully."
        );
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        setError("Could not sign in with Google.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <div className="page-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[14%] h-64 w-64 rounded-full bg-[rgba(215,163,102,0.12)] blur-3xl" />
        <div className="absolute bottom-[8%] right-[10%] h-72 w-72 rounded-full bg-white/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 28 }}
        className="auth-card relative z-10 w-full max-w-md p-8 sm:p-10"
      >
        <div className="mb-8 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
            Shared Space
          </div>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(239,188,130,0.2)] bg-[rgba(215,163,102,0.12)] text-[var(--accent-strong)] shadow-[0_10px_30px_rgba(215,163,102,0.16)]">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M4 7.5 12 3l8 4.5-8 4.5L4 7.5Zm0 4.5 8 4.5 8-4.5M4 16.5 12 21l8-4.5"
              />
            </svg>
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            {isLogin ? "Enter your space" : "Start a new space"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            {isLogin
              ? "Minimal chrome. Shared world first."
              : "Create an account and step into the world."}
          </p>
        </div>

        <div className="segmented-control mb-8 grid grid-cols-2">
          <button
            onClick={() => router.push("/login")}
            className="segmented-option"
            data-active={isLogin}
          >
            Sign In
          </button>
          <button
            onClick={() => router.push("/signup")}
            className="segmented-option"
            data-active={!isLogin}
          >
            Sign Up
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={isLogin ? "login" : "signup"}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {!isLogin && (
              <AuthFormInput
                name="userName"
                placeholder="Username"
                value={formData.userName}
                onChange={handleChange}
                icon={User}
              />
            )}
            <AuthFormInput
              name="email"
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              icon={Mail}
            />
            <AuthFormInput
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              icon={Lock}
              onIconClick={() => setShowPassword((p) => !p)}
            />
            {!isLogin && (
              <AuthFormInput
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                icon={Lock}
                onIconClick={() => setShowConfirmPassword((p) => !p)}
              />
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border px-4 py-3 text-sm font-medium"
                  style={{
                    background: "var(--danger-soft)",
                    borderColor: "rgba(239, 124, 120, 0.2)",
                    color: "var(--danger)",
                  }}
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium"
                  style={{
                    background: "var(--success-soft)",
                    borderColor: "rgba(122, 194, 142, 0.18)",
                    color: "var(--success)",
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="auth-button w-full"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>{isLogin ? "Signing in..." : "Creating account..."}</span>
                  </>
                ) : (
                  <span>{isLogin ? "Enter Space" : "Create Account"}</span>
                )}
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/8" />
              </div>
              <div className="relative flex justify-center">
                <span className="rounded-full border border-white/8 bg-[var(--bg-panel-strong)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                  Or continue with
                </span>
              </div>
            </div>

            <GoogleSignInButton
              onSignIn={handleGoogleSignIn}
              text={isLogin ? "Sign in with Google" : "Sign up with Google"}
            />
          </motion.form>
        </AnimatePresence>

        <div className="mt-7 text-center text-sm text-[var(--text-muted)]">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => router.push(isLogin ? "/signup" : "/login")}
            className="font-semibold text-[var(--accent-strong)] hover:text-[var(--text-primary)]"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
