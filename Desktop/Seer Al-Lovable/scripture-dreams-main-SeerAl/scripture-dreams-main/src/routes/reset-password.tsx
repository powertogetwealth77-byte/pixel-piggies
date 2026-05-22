import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { LockKeyhole, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | SEER AI" },
      {
        name: "description",
        content: "Set a new secure password for your Seer AI account.",
      },
    ],
  }),
  component: ResetPasswordComponent,
});

function ResetPasswordComponent() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Password Validation
  const [passwordError, setPasswordError] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);

  const validatePassword = (val: string) => {
    if (!val) {
      setPasswordError("Password is required.");
    } else if (val.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
    } else {
      setPasswordError("");
    }
  };

  const validateConfirm = (val: string, pass: string) => {
    if (!val) {
      setConfirmError("Please confirm your password.");
    } else if (val !== pass) {
      setConfirmError("Passwords do not match.");
    } else {
      setConfirmError("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (passwordTouched) {
      validatePassword(val);
    }
    if (confirmTouched) {
      validateConfirm(confirmPassword, val);
    }
  };

  const handleConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setConfirmPassword(val);
    if (confirmTouched) {
      validateConfirm(val, password);
    }
  };

  // Detect Caps Lock
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordTouched(true);
    setConfirmTouched(true);
    validatePassword(password);
    validateConfirm(confirmPassword, password);

    if (passwordError || confirmError || !password || !confirmPassword) {
      toast.error("Please ensure both fields are filled correctly.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(error.message || "Failed to update password.");
      } else {
        toast.success("Your password has been updated successfully!");
        setIsSuccess(true);
        // Automatically redirect after 3 seconds
        setTimeout(() => {
          navigate({ to: "/dashboard" as any });
        }, 3000);
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Reset password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user is actually authenticated via recovery link or direct session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // In some cases, hash is parsed asynchronously. Let's wait a brief moment.
        setTimeout(async () => {
          const { data: { secondSession } } = await (supabase.auth as any).getSession();
          if (!secondSession) {
            toast.error("Invalid or expired password reset link.");
          }
        }, 1500);
      }
    };
    checkSession();
  }, []);

  return (
    <AuthBackground>
      <div className="flex-grow flex items-center justify-center p-6 md:p-12 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[460px]"
        >
          <div className="w-full bg-[#111827] rounded-3xl border border-[rgba(201,168,76,0.24)] p-8 md:p-10 shadow-elegant shadow-black/80 relative overflow-hidden">
            {/* Top Gold Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent" />

            {isSuccess ? (
              <div className="text-center space-y-6">
                <div className="mx-auto h-12 w-12 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C]">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold font-display tracking-tight text-[#F8F5EC]">
                    Password Updated
                  </h2>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Your password has been successfully reset. Redirecting you to your dashboard...
                  </p>
                </div>
                <div className="flex justify-center pt-2">
                  <Loader2 className="h-5 w-5 animate-spin text-[#C9A84C]" />
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold font-display tracking-tight text-[#F8F5EC]">
                    Set New Password
                  </h2>
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                    Please choose a strong, secure new password for your account.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* New Password */}
                  <div className="space-y-2">
                    <label
                      htmlFor="password"
                      className="text-xs font-semibold uppercase tracking-wider text-gray-400 block"
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                        <LockKeyhole className="h-4 w-4" />
                      </span>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={handlePasswordChange}
                        onBlur={() => {
                          setPasswordTouched(true);
                          validatePassword(password);
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        placeholder="••••••••"
                        aria-label="New Password"
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
                        disabled={isLoading}
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

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label
                      htmlFor="confirmPassword"
                      className="text-xs font-semibold uppercase tracking-wider text-gray-400 block"
                    >
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                        <LockKeyhole className="h-4 w-4" />
                      </span>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={handleConfirmChange}
                        onBlur={() => {
                          setConfirmTouched(true);
                          validateConfirm(confirmPassword, password);
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        placeholder="••••••••"
                        aria-label="Confirm New Password"
                        aria-invalid={!!confirmError}
                        aria-describedby={confirmError ? "confirm-error" : undefined}
                        className={`w-full h-12 pl-11 pr-12 bg-[#0A0E1A] border ${
                          confirmError
                            ? "border-red-500/50 focus:border-red-500/80"
                            : confirmTouched && !confirmError
                              ? "border-[#C9A84C]/50 focus:border-[#C9A84C]/80"
                              : "border-[rgba(201,168,76,0.12)] focus:border-[#C9A84C]/60"
                        } rounded-xl text-sm text-[#F8F5EC] placeholder-gray-600 focus:outline-none transition-all duration-300`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-[#C9A84C] focus:outline-none transition-colors"
                      >
                        {showConfirmPassword ? (
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

                    {confirmError && (
                      <p
                        id="confirm-error"
                        className="text-xs text-red-400 flex items-center gap-1.5 mt-1"
                      >
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {confirmError}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-2030 btn-gold-2030 w-full h-12 rounded-full font-medium transition-all duration-300 text-sm shadow-md flex items-center justify-center cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#0A0E1A]" />
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AuthBackground>
  );
}
export default ResetPasswordComponent;
