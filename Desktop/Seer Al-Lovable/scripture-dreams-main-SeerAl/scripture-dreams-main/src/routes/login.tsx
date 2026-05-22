import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { LoginCard } from "@/components/auth/LoginCard";
import { BookOpen } from "lucide-react";

const loginSearchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  head: () => ({
    meta: [
      { title: "Sign In | SEER AI — Scripture-First Dream Discernment" },
      {
        name: "description",
        content:
          "Sign in to Seer AI. Scripture-first dream interpretation for believers seeking clarity, wisdom, and peace.",
      },
      { property: "og:title", content: "Sign In | SEER AI" },
      {
        property: "og:description",
        content: "Biblical, secure, and reverent dream reflection software.",
      },
    ],
  }),
  component: LoginComponent,
});

function LoginComponent() {
  const { next } = Route.useSearch();

  return (
    <AuthBackground>
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen w-full">
        {/* Left Side (Cinematic Headline & Scripture) */}
        <div className="lg:col-span-7 flex flex-col justify-center px-6 py-12 md:px-16 lg:px-24 bg-[#0A0E1A]/50 border-b lg:border-b-0 lg:border-r border-[rgba(201,168,76,0.12)] relative overflow-hidden select-none">
          {/* Ambient glow accent behind left text */}
          <div className="absolute top-[20%] left-[-10%] w-[500px] height-[500px] rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.03)_0%,transparent_70%)] pointer-events-none" />

          <div className="max-w-[580px] relative z-10 space-y-8">
            {/* Small Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/5 text-xs font-medium tracking-wide text-[#C9A84C]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
              Biblical Dream Discernment Platform
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-[1.1] tracking-tight text-[#F8F5EC]">
              Discern What <br className="hidden md:inline" />
              <span className="text-gradient-gold">Heaven May Be Saying.</span>
            </h1>

            {/* Subtext */}
            <p className="text-base md:text-lg text-gray-300 font-sans leading-relaxed">
              Scripture-first dream interpretation for believers seeking clarity,
              wisdom, and peace. Private, secure, and grounded in Biblical truth.
            </p>

            {/* Scripture Quote Box */}
            <div className="border-l-2 border-[#C9A84C]/50 pl-6 py-2 my-8 space-y-2">
              <p className="text-sm md:text-base text-gray-400 italic font-display leading-relaxed">
                "For God speaks once, yes twice, yet man perceives it not. In a
                dream, in a vision of the night, when deep sleep falls upon men,
                while slumbering on their beds, then He opens the ears of men, and
                seals their instruction..."
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C] flex items-center gap-2">
                <BookOpen className="h-3 w-3" />
                Job 33:14-16
              </p>
            </div>

            {/* Premium Trust Message */}
            <div className="pt-4 flex items-center gap-4 text-xs text-gray-400 border-t border-[rgba(201,168,76,0.12)]">
              <div>
                <span className="font-semibold text-[#F8F5EC]">Reverent & Vetted</span>
                <p className="mt-0.5">Strictly aligned with God's word</p>
              </div>
              <div className="h-8 w-px bg-[rgba(201,168,76,0.12)]" />
              <div>
                <span className="font-semibold text-[#F8F5EC]">Zero Mixture</span>
                <p className="mt-0.5">Absolutely no new-age or occult practices</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side (Form) */}
        <div className="lg:col-span-5 flex items-center justify-center p-6 md:p-12 bg-[#0A0E1A]/20">
          <LoginCard next={next} />
        </div>
      </div>
    </AuthBackground>
  );
}
export default LoginComponent;
