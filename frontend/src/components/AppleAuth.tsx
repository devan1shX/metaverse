"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, CheckCircle2 } from "lucide-react";
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
    <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="auth-card p-8 sm:p-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-100 rounded-2xl mb-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-gray-500">
            {isLogin ? "Sign in to continue your journey" : "Join the metaverse today"}
          </p>
        </div>

        <div className="flex mb-8 bg-gray-100 rounded-xl p-1 relative">
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute bg-white shadow-sm rounded-lg"
            style={{
              width: "50%",
              height: "calc(100% - 8px)",
              top: "4px",
              left: isLogin ? "4px" : "calc(50% - 4px)",
            }}
          />
          <button 
            onClick={() => router.push("/login")} 
            className={`auth-tab z-10 ${isLogin ? 'active' : ''}`}
          >
            Sign In
          </button>
          <button 
            onClick={() => router.push("/signup")} 
            className={`auth-tab z-10 ${!isLogin ? 'active' : ''}`}
          >
            Sign Up
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={isLogin ? "login" : "signup"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
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
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center text-sm font-medium"
                >
                  {error}
                </motion.p>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-center text-sm font-medium flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> {success}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="auth-button flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{isLogin ? "Signing in..." : "Creating account..."}</span>
                  </>
                ) : (
                  <span>{isLogin ? "Sign In" : "Create Account"}</span>
                )}
              </button>
            </div>
          </motion.form>
        </AnimatePresence>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => router.push(isLogin ? "/signup" : "/login")}
              className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
