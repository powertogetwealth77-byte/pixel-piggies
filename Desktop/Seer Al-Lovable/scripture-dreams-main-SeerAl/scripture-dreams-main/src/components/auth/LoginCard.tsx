import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen,
  ShieldCheck,
  Lock,
  HeartHandshake,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  LockKeyhole,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface LoginCardProps {
  next?: string;
}

export const LoginCard: React.FC<LoginCardProps> = ({ next }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Email Validation
  const [emailError, setEmailError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError("Email address is required.");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setEmailError("Please enter a valid email address.");
    } else {
      setEmailError("");
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailTouched) {
      validateEmail(val);
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    validateEmail(email);
  };

  // Password Validation
  const [passwordError, setPasswordError] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);

  const validatePassword = (val: string) => {
    if (!val) {
      setPasswordError("Password is required.");
    } else if (val.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
    } else {
      setPasswordError("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (passwordTouched) {
      validatePassword(val);
    }
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    validatePassword(password);
  };

  // Detect Caps Lock
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    validateEmail(email);
    validatePassword(password);

    if (emailError || passwordError || !email || !password) {
      toast.error("Please correct the errors in the form.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message || "Invalid email or password.");
      } else {
        toast.success("Welcome back! You have successfully signed in.");
        // Redirect to intended route
        navigate({ to: next || "/dashboard" });
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Login submission error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const redirectToUrl =
        window.location.origin +
        (next ? `/login?next=${encodeURIComponent(next)}` : "/dashboard");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectToUrl,
        },
      });

      if (error) {
        toast.error(error.message || "Google Sign-In failed.");
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred during Google Sign-In.");
      console.error("Google Auth error:", err);
      setIsGoogleLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[460px] mx-auto flex flex-col items-center"
    >
      {/* Login Card */}
      <div className="w-full bg-[#111827] rounded-3xl border border-[rgba(201,168,76,0.24)] p-8 md:p-10 shadow-elegant shadow-black/80 relative overflow-hidden">
        {/* Subtle top gold highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent" />

        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold font-display tracking-tight text-[#F8F5EC]">
            Welcome Back
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Sign in to access your dashboard and saved dreams
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email input field */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wider text-gray-400 block"
            >
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                disabled={isLoading || isGoogleLoading}
                placeholder="you@domain.com"
                aria-label="Email Address"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "email-error" : undefined}
                className={`w-full h-12 pl-11 pr-4 bg-[#0A0E1A] border ${
                  emailError
                    ? "border-red-500/50 focus:border-red-500/80"
                    : emailTouched && !emailError
                      ? "border-[#C9A84C]/50 focus:border-[#C9A84C]/80"
                      : "border-[rgba(201,168,76,0.12)] focus:border-[#C9A84C]/60"
                } rounded-xl text-sm text-[#F8F5EC] placeholder-gray-600 focus:outline-none transition-all duration-300`}
              />
            </div>
            {emailError && (
              <p
                id="email-error"
                className="text-xs text-red-400 flex items-center gap-1.5 mt-1"
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                {emailError}
              </p>
            )}
          </div>

          {/* Password input field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-wider text-gray-400"
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                search={{ next } as any}
                className="text-xs font-medium text-[#C9A84C] hover:text-[#E8C87A] transition-colors focus:outline-none focus:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <LockKeyhole className="h-4 w-4" />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
                onKeyDown={handleKeyDown}
                disabled={isLoading || isGoogleLoading}
                placeholder="••••••••"
                aria-label="Password"
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "password-error" : undefined}
                className={`w-full h-12 pl-11 pr-12 bg-[#0A0E1A] border ${
                  passwordError
                    ? "border-red-500/50 focus:border-red-500/80"
                    : passwordTouched && !passwordError
                      ? "border-[#C9A84C]/50 focus:border-[#C9A84C]/80"
                      : "border-[rgba(201,168,76,0.12)] focus:border-[#C9A84C]/60"
                } rounded-xl text-sm text-[#F8F5EC] placeholder-gray-600 focus:outline-none transition-all duration-300`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || isGoogleLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-[#C9A84C] focus:outline-none transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {capsLockActive && (
              <p className="text-xs text-[#C9A84C] flex items-center gap-1.5 mt-1 font-medium animate-pulse">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Caps Lock is active
              </p>
            )}

            {passwordError && (
              <p
                id="password-error"
                className="text-xs text-red-400 flex items-center gap-1.5 mt-1"
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                {passwordError}
              </p>
            )}
          </div>

          {/* Continue button */}
          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="btn-2030 btn-gold-2030 w-full h-12 rounded-full font-medium transition-all duration-300 text-sm shadow-md mt-2 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#0A0E1A]" />
            ) : (
              <span>Continue</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center">
          <div className="flex-grow border-t border-[rgba(201,168,76,0.12)]"></div>
          <span className="mx-4 text-xs uppercase tracking-wider text-gray-500 font-semibold bg-[#111827] px-2 relative z-10">
            or continue with
          </span>
          <div className="flex-grow border-t border-[rgba(201,168,76,0.12)]"></div>
        </div>

        {/* Google OAuth action */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          className="btn-2030 btn-ghost-2030 w-full h-12 rounded-full font-medium text-sm flex items-center justify-center gap-3 border border-[rgba(201,168,76,0.24)] hover:bg-[rgba(201,168,76,0.04)] text-[#F8F5EC] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isGoogleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#C9A84C]" />
          ) : (
            <>
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign In with Google</span>
            </>
          )}
        </button>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-400">Don't have an account? </span>
          <Link
            to="/checkout"
            search={{ plan: "trial" } as any}
            className="font-semibold text-[#C9A84C] hover:underline"
          >
            Create account
          </Link>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 px-4 max-w-[400px]">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <BookOpen className="h-4 w-4 text-[#C9A84C] shrink-0" />
          <span>Scripture-First</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="h-4 w-4 text-[#C9A84C] shrink-0" />
          <span>No Occult Practices</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Lock className="h-4 w-4 text-[#C9A84C] shrink-0" />
          <span>Private & Secure</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <HeartHandshake className="h-4 w-4 text-[#C9A84C] shrink-0" />
          <span>Built for Believers</span>
        </div>
      </div>
    </motion.div>
  );
};
export default LoginCard;
