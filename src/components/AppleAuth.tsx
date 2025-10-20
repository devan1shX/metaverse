"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

const AuthBackground = () => (
  <div className="auth-background">
    <div className="gradient-bg" />
  </div>
);

interface AuthFormInputProps {
  name: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ComponentType<{ className?: string }>;
  onIconClick?: () => void;
}

const AuthFormInput = ({
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  icon: Icon,
  onIconClick,
}: AuthFormInputProps) => (
  <div className="relative">
    <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-light-label dark:text-apple-dark-label w-5 h-5" />
    <input
      id={name}
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="auth-input pl-12 pr-4"
      required
    />
    {onIconClick && (
      <button
        type="button"
        onClick={onIconClick}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-apple-light-label dark:text-apple-dark-label hover:text-apple-black dark:hover:text-apple-white transition-colors"
      >
        {type === "password" ? (
          <Eye className="w-5 h-5" />
        ) : (
          <EyeOff className="w-5 h-5" />
        )}
      </button>
    )}
  </div>
);

export function AppleAuth() {
  const { login, signup } = useAuth();
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

    // Perform simple frontend validation first for better UX
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
    setError('');
    setSuccess('');

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
        setSuccess(isLogin ? 'Login successful!' : 'Account created successfully!');
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        
        setError(isLogin ? "Invalid credentials." : "Could not create account.");
      }
    } catch (err: any) {
      // catch the specific error message from the AuthContext
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-subtle-fade-in">
      <AuthBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="auth-card rounded-3xl p-8 sm:p-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-1">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-apple-light-label dark:text-apple-dark-label">
            {isLogin ? "Sign in to continue." : "Join the metaverse."}
          </p>
        </div>

        <div className="flex mb-8 bg-apple-light-bg dark:bg-apple-dark-bg rounded-xl p-1 relative">
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute inset-0 bg-apple-light-elevated dark:bg-apple-dark-elevated shadow-md rounded-lg"
            style={{
              width: isLogin ? "50%" : "50%",
              left: isLogin ? "0%" : "50%",
            }}
          />
          <button onClick={() => router.push("/login")} className="auth-tab">
            Sign In
          </button>
          <button onClick={() => router.push("/signup")} className="auth-tab">
            Sign Up
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={isLogin ? "login" : "signup"}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            onSubmit={handleSubmit}
            className="space-y-5"
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
              placeholder="Email Address"
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
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                icon={Lock}
                onIconClick={() => setShowConfirmPassword((p) => !p)}
              />
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 bg-red-500/10 rounded-lg text-red-500 text-center text-xs font-semibold"
                >
                  {error}
                </motion.p>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 bg-green-500/10 rounded-lg text-green-500 text-center text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> {success}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="auth-button flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>
            </div>
          </motion.form>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
