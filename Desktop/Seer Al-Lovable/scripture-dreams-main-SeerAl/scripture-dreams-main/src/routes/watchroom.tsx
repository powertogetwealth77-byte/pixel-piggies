import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/watchroom")({
  head: () => ({
    meta: [
      { title: "The Watchroom — Prophetic Group Mentorship | SEER AI" },
      {
        name: "description",
        content:
          "You were not called to carry your gift alone. Reserve your seat in The Watchroom — Scripture-first prophetic mentorship for seers who have been through the fire.",
      },
      { property: "og:title", content: "The Watchroom — SEER AI" },
      {
        property: "og:description",
        content:
          "Prophetic group mentorship for those carrying the gift in isolation. 50 seats per cohort.",
      },
    ],
  }),
  beforeLoad: async ({ location }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw redirect({
          to: "/login" as any,
          search: { next: location.pathname } as any,
        });
      }
      
      const email = session.user.email;
      const userId = session.user.id;

      // Query watchroom_members as the Shopify webhook-derived source of truth
      const { data: watchroomMember, error: watchroomError } = await supabase
        .from("watchroom_members")
        .select("plan, status")
        .or(`user_id.eq.${userId},email.eq.${email}`)
        .eq("status", "active")
        .maybeSingle();

      if (watchroomError) {
        console.error("Watchroom membership query error:", watchroomError);
      }

      // Query impartation_members as fallback/higher-tier source of truth
      const { data: impartationMember, error: impartationError } = await supabase
        .from("impartation_members")
        .select("status")
        .or(`user_id.eq.${userId},email.eq.${email}`)
        .eq("status", "active")
        .maybeSingle();

      if (impartationError) {
        console.error("Impartation membership query error:", impartationError);
      }

      const hasPaidAccess = watchroomMember || impartationMember;

      if (!hasPaidAccess) {
        throw redirect({ to: "/pricing" as any });
      }

      return { session, watchroomMember, impartationMember };
    } catch (error) {
      if (error instanceof Response || (error as any)._type === "redirect") {
        throw error;
      }
      console.error("Auth / Access verification failed:", error);
      throw redirect({ to: "/login" as any, search: { next: location.pathname } as any });
    }
  },
  component: WatchroomPage,
});

function WatchroomPage() {
  const navigate = useNavigate();
  const [seatsRemaining, setSeatsRemaining] = useState<number>(37);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistDone, setWaitlistDone] = useState(false);

  // Seats
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("watchroom_seats_remaining")
        .select("seats_remaining")
        .eq("cohort", "cohort-1")
        .maybeSingle();
      if (cancelled) return;
      const remaining = (data as { seats_remaining?: number } | null)
        ?.seats_remaining;
      if (typeof remaining === "number") setSeatsRemaining(remaining);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const soldOut = seatsRemaining <= 0;

  async function joinWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!waitlistEmail) return;
    await supabase
      .from("watchroom_waitlist")
      .insert({ email: waitlistEmail });
    setWaitlistDone(true);
  }



  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        @keyframes wrPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.55), 0 10px 30px -10px rgba(201,168,76,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(201,168,76,0), 0 10px 40px -8px rgba(201,168,76,0.6); }
        }
        .wr-pulse { animation: wrPulse 2.4s ease-in-out infinite; }
        .wr-serif { font-family: var(--font-display); }
        .wr-diamond::before {
          content: "◆";
          color: #C9A84C;
          margin-right: 14px;
          font-size: 0.7em;
          vertical-align: middle;
        }
      `}</style>

      {/* 1. HERO */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(201,168,76,0.18),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
          <p className="mb-6 text-[11px] uppercase tracking-[0.35em] text-primary">
            For those who have been through the fire
          </p>
          <h1 className="wr-serif text-4xl leading-[1.1] text-foreground md:text-6xl">
            You Were Not Called to
            <br />
            Carry Your Gift Alone.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-[16px] italic text-primary">
            A Scripture-first room of seers who keep watch together — where iron sharpens iron and no dream is carried in silence.
          </p>
          <p className="mt-6 text-sm text-foreground/55">
            "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend."
            <br />
            <span className="text-primary">— Proverbs 27:17</span>
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <a
              href="#offer"
              className="wr-pulse inline-flex items-center justify-center rounded-md bg-primary px-8 py-4 text-sm font-semibold tracking-wide text-primary-foreground transition hover:brightness-110"
            >
              Reserve My Seat →
            </a>
            <p className="text-xs uppercase tracking-[0.25em] text-foreground/60">
              <span className="text-primary">{seatsRemaining}</span> of 50 seats remaining
            </p>
          </div>
        </div>
      </section>

      {/* 2. STORY */}
      <section className="px-6 py-24">
        <div
          className="mx-auto max-w-[800px] wr-serif text-[16px] leading-[1.85] text-foreground/85 space-y-6"
        >
          <p>
            Marcus had been seeing dreams since he was nine. Pillars of smoke. Locked doors. A woman in a white robe weeping over a city he had never been to. By the time he turned thirty-four, he had filled fourteen journals and told almost no one.
          </p>
          <p>
            He tried his pastor once. The room got quiet. "Be careful with that, brother." He tried a small group. They prayed for him like he was sick.
          </p>
          <p>
            So he stopped talking. He kept writing. He kept seeing. And he kept carrying it alone — until the dreams started waking him at 3:17 every morning, and he could not tell anymore whether God was speaking or whether something was breaking inside of him.
          </p>
          <p>
            Marcus did not need another book. He did not need a louder prayer life. He did not need to "believe more."
          </p>
          <p className="text-primary">He needed a Watchroom.</p>
        </div>
      </section>

      {/* 3. HARD TRUTH */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-3xl rounded-md border-l-2 border-border bg-card p-8 md:p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">
            The hard truth
          </p>
          <p
            className="wr-serif mt-4 text-[17px] leading-[1.8] text-foreground/85"
          >
            The reason most seers burn out, dull, or quietly walk away is not lack of anointing. It is isolation. You were never meant to interpret your own dreams in the dark, second-guess every vision, and explain yourself to people who flinch when you open your mouth. A gift in a room by itself rots. The same gift in a room of trained, vetted, Scripture-anchored seers gets sharpened, corrected, and sent.
          </p>
        </div>
      </section>

      {/* 4. WHO IS THIS FOR */}
      <section className="px-6 py-20 border-t border-white/5">
        <div className="mx-auto max-w-3xl">
          <h2 className="wr-serif text-3xl text-foreground md:text-4xl">
            This Room Is For You If…
          </h2>
          <ul className="mt-10 space-y-5 text-[15.5px] leading-relaxed text-foreground/85">
            {[
              "You have been seeing for years and you still have nobody safe to tell.",
              "Your last attempt to share a dream made you regret opening your mouth.",
              "You are tired of guessing whether what you saw was God, your soul, or the enemy.",
              "You have outgrown the people praying over you, but you don't know where to go next.",
              "You feel the weight of intercession and have no one to stand watch with you.",
              "You know you are called to interpret for others, but you have never been trained how.",
            ].map((line) => (
              <li key={line} className="wr-diamond pl-1">
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-sm text-primary">
            Only 50 seats. We close the cohort when it fills. There is no expansion list.
          </p>
        </div>
      </section>

      {/* 5. VALUE STACK */}
      <section className="px-6 py-20 border-t border-white/5">
        <div className="mx-auto max-w-3xl">
          <h2 className="wr-serif text-3xl text-foreground md:text-4xl">
            What You Receive Inside The Watchroom
          </h2>
          <div className="mt-10 divide-y divide-white/8 border-y border-white/8">
            {[
              ["Weekly Live Interpretation Lab (90 min)", "$197/mo"],
              ["Vetted Seer-Only Community Access", "$97/mo"],
              ["Submit-A-Dream Priority Queue", "$67/mo"],
              ["Monthly Prophetic Masterclass", "$147/mo"],
              ["1-on-1 Symbol Audit (quarterly)", "$250/mo"],
              ["Watchman Prayer Cover Rotation", "$80/mo"],
              ["Private Library: Decoded Symbols Index", "$45/mo"],
              ["Direct Line to the Teaching Team", "$120/mo"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-6 py-4"
              >
                <span className="text-[15px] text-foreground/85">{label}</span>
                <span className="text-[14px] tracking-wide text-primary">
                  {value}
                </span>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-6 py-5">
              <span className="text-[15px] font-semibold text-foreground">
                Total Real Value
              </span>
              <span className="text-[15px] font-semibold text-foreground">
                $1,003/month
              </span>
            </div>
          </div>
          <div className="mt-10 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-foreground/55">
              Your investment today
            </p>
            <p className="wr-serif mt-3 text-5xl text-primary md:text-6xl">
              $197<span className="text-2xl text-foreground/60">/month</span>
            </p>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className="px-6 py-20 border-t border-white/5">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {[
            {
              quote:
                "I have been a seer for 22 years. I joined The Watchroom thinking I would learn one or two things. Within the first month they corrected a misinterpretation I had been carrying for a decade. I wept. I have never had a room like this.",
              who: "— D. Okafor",
              tier: "Watchman tier",
            },
            {
              quote:
                "The first time I shared a dream nobody flinched. Nobody told me to be careful. They opened Scripture, they asked sharper questions than I knew how to ask, and they sent me out with prayer direction. I stopped feeling crazy.",
              who: "— A. Reyes",
              tier: "Seeker tier",
            },
          ].map((t) => (
            <div
              key={t.who}
              className="rounded-md border border-white/8 bg-card p-7"
            >
              <div className="mb-3 text-primary text-sm tracking-wider">★★★★★</div>
              <p className="wr-serif text-[15.5px] leading-[1.8] text-foreground/85">
                "{t.quote}"
              </p>
              <div className="mt-5 flex items-center gap-3 text-xs">
                <span className="text-foreground/80">{t.who}</span>
                <span className="rounded-sm border border-border px-2 py-0.5 uppercase tracking-wider text-[10px] text-primary">
                  {t.tier}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. THE OFFER */}
      <section
        id="offer"
        className="px-6 py-24 border-t border-white/5 bg-background"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">
            The Offer
          </p>
          <h2 className="wr-serif mt-4 text-3xl text-foreground md:text-5xl">
            $1,003 of mentorship, community, and prayer cover.
            <br />
            <span className="text-primary">$197/month.</span>
          </h2>
          <p
            className="wr-serif mx-auto mt-8 max-w-2xl text-[17px] italic leading-relaxed text-foreground/80"
          >
            "How much is it worth to you to stop carrying this in the dark?"
          </p>

          {soldOut ? (
            <WaitlistForm
              email={waitlistEmail}
              setEmail={setWaitlistEmail}
              done={waitlistDone}
              onSubmit={joinWaitlist}
            />
          ) : (
            <div className="mt-10 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => navigate({ to: '/dream/new' as any })}
                className="wr-pulse w-full max-w-md rounded-md bg-primary px-8 py-5 text-sm font-semibold tracking-wide text-primary-foreground transition hover:brightness-110 md:w-auto"
              >
                Reserve My Seat in The Watchroom →
              </button>
              <p className="text-xs uppercase tracking-[0.25em] text-foreground/60">
                <span className="text-primary">{seatsRemaining}</span> of 50 seats remaining
              </p>
            </div>
          )}

          <p className="mt-10 text-xs leading-relaxed text-foreground/55">
            30-day prayer-tested guarantee. If after one full month of showing up you do not believe your gift has been sharpened, write us. We will refund every dollar without argument.
          </p>
        </div>
      </section>

      {/* 8. FAQ */}
      <section className="px-6 py-20 border-t border-white/5">
        <div className="mx-auto max-w-3xl">
          <h2 className="wr-serif text-3xl text-foreground md:text-4xl">
            Questions Before You Reserve
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {[
              {
                q: "I have never been formally trained. Am I too new for this room?",
                a: "No. The Watchroom is for anyone who has been seeing — whether for one year or thirty. We meet you where you are. What we ask is that you come willing to be sharpened and Scripture-anchored.",
              },
              {
                q: "What if I miss a live session?",
                a: "Every lab is recorded and archived in the private library. You can submit your dream in advance and the team will address it on the call even if you cannot attend live.",
              },
              {
                q: "Is the community vetted? I have been burned before.",
                a: "Yes. Every member is approved by hand. We do not let in spectators, debaters, or people looking to perform. This is a working room.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Month-to-month. No long contracts. Your seat stays yours as long as you stay active.",
              },
            ].map((item) => (
              <AccordionItem
                key={item.q}
                value={item.q}
                className="border-white/8"
              >
                <AccordionTrigger className="wr-serif text-left text-[16px] text-foreground/90 hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-[14.5px] leading-relaxed text-foreground/70">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* 9. SCRIPTURE CLOSING */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto h-px w-24 bg-primary" />
          <p
            className="wr-serif mt-10 text-[19px] italic leading-[1.85] text-foreground/85"
          >
            "And he shall sit as a refiner and purifier of silver: and he shall purify the sons of Levi, and purge them as gold and silver, that they may offer unto the LORD an offering in righteousness."
          </p>
          <p className="mt-6 text-sm tracking-wider text-primary">
            — Malachi 3:3
          </p>
          <div className="mx-auto mt-10 h-px w-24 bg-primary" />
        </div>
        <div className="mt-12 text-center">
          <Link to="/" className="text-xs uppercase tracking-[0.3em] text-foreground/50 hover:text-primary">
            ← Return Home
          </Link>
        </div>
      </section>
    </div>
  );
}

function WaitlistForm({
  email,
  setEmail,
  done,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  done: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (done) {
    return (
      <div className="mt-10 rounded-md border border-border bg-card p-8">
        <p className="wr-serif text-primary text-lg">You are on the list.</p>
        <p className="mt-2 text-sm text-foreground/70">
          We will email you the moment the next cohort opens.
        </p>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="mt-10 mx-auto max-w-md text-left">
      <p className="text-center text-sm uppercase tracking-[0.25em] text-primary">
        This cohort is full
      </p>
      <p className="mt-3 text-center text-sm text-foreground/70">
        Join the waitlist for the next opening.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:brightness-110"
        >
          Join Waitlist
        </button>
      </div>
    </form>
  );
}
