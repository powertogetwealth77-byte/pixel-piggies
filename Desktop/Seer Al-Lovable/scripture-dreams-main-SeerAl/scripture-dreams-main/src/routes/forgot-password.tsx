import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const forgotPasswordSearchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute("/forgot-password")({
  validateSearch: forgotPasswordSearchSchema,
  head: () => ({
    meta: [
      { title: "Forgot Password | SEER AI" },
      {
        name: "description",
        content: "Reset your Seer AI account password safely and securely.",
      },
    ],
  }),
  component: ForgotPasswordComponent,
});

function ForgotPasswordComponent() {
  const { next } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    validateEmail(email);

    if (emailError || !email) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const resetRedirectUrl = window.location.origin + "/reset-password";
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetRedirectUrl,
      });

      if (error) {
        toast.error(error.message || "Failed to send reset link.");
      } else {
        toast.success("Password reset email sent successfully!");
        setIsSuccess(true);
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Forgot password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

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

            {/* Back button */}
            <Link
              to="/login"
              search={{ next } as any}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-[#C9A84C] transition-colors mb-6 focus:outline-none"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>

            {isSuccess ? (
              <div className="text-center space-y-6">
                <div className="mx-auto h-12 w-12 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C]">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold font-display tracking-tight text-[#F8F5EC]">
                    Check Your Email
                  </h2>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    We've sent a password reset link to <strong className="text-gray-200">{email}</strong>.
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Didn't receive the email? Check your spam folder or try again in a few minutes.
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold font-display tracking-tight text-[#F8F5EC]">
                    Reset Password
                  </h2>
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                    Enter the email associated with your account, and we'll send a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Input */}
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
                        disabled={isLoading}
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

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-2030 btn-gold-2030 w-full h-12 rounded-full font-medium transition-all duration-300 text-sm shadow-md flex items-center justify-center cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#0A0E1A]" />
                    ) : (
                      <span>Send Reset Link</span>
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
export default ForgotPasswordComponent;
