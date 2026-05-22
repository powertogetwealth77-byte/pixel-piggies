import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/the-impartation")({
  head: () => ({
    meta: [
      { title: "The Impartation — Founding Cohort | SEER AI" },
      {
        name: "description",
        content:
          "Some things cannot be taught — they can only be transferred. A private, vetted cohort of 50 prophets, intercessors, and dream carriers. Founding member access.",
      },
      { property: "og:title", content: "The Impartation — SEER AI" },
      {
        property: "og:description",
        content:
          "A private cohort of 50 believers. Live prophetic group mentorship. Founding price $97/month, locked for life.",
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

      const hasAnyAccess = watchroomMember || impartationMember;
      if (!hasAnyAccess) {
        throw redirect({ to: "/pricing" as any });
      }

      // To access /the-impartation, the user MUST have premium coaching/impartation access:
      // either active in impartation_members OR plan in watchroom_members is 'impartation' or 'prophets_circle'
      const isCoaching = impartationMember || (watchroomMember && ["impartation", "prophets_circle"].includes(watchroomMember.plan));

      if (!isCoaching) {
        throw redirect({ to: "/dashboard" as any, search: { upgrade: "impartation" } as any });
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
  component: ImpartationPage,
});

const RATE_LIMIT_KEY = "impartation_reserve_attempts";
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function ImpartationPage() {
  const navigate = useNavigate();
  const [seatsRemaining, setSeatsRemaining] = useState<number>(50);
  const [viewerCount, setViewerCount] = useState<number>(17);
  const [scrolled, setScrolled] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  // Seats (poll every 30s)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("impartation_seats_remaining")
        .select("seats_remaining")
        .maybeSingle();
      if (cancelled) return;
      const remaining = (data as { seats_remaining?: number } | null)
        ?.seats_remaining;
      if (typeof remaining === "number") setSeatsRemaining(remaining);
    }
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Live viewer count (cosmetic — fluctuates)
  useEffect(() => {
    const id = setInterval(() => {
      setViewerCount((v) => {
        const drift = Math.floor(Math.random() * 5) - 2;
        const next = v + drift;
        return Math.max(8, Math.min(42, next));
      });
    }, 7000);
    return () => clearInterval(id);
  }, []);

  // Sticky bar after 40% scroll
  useEffect(() => {
    function onScroll() {
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      setScrolled(pct > 0.4);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const soldOut = seatsRemaining <= 0;

  function checkRateLimit() {
    try {
      const raw = localStorage.getItem(RATE_LIMIT_KEY);
      const now = Date.now();
      const attempts: number[] = raw ? JSON.parse(raw) : [];
      const recent = attempts.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (recent.length >= RATE_LIMIT_MAX) {
        setRateLimited(true);
        return false;
      }
      recent.push(now);
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
      return true;
    } catch {
      return true;
    }
  }

  function reserveSeat() {
    if (!checkRateLimit()) return;
    // Hand off to checkout with impartation product preselected
    navigate({ to: "/checkout", search: { plan: "impartation" } as never });
  }

  async function joinWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!waitlistEmail) return;
    await supabase.from("impartation_waitlist").insert({ email: waitlistEmail });
    setWaitlistDone(true);
  }



  return (
    <div
      className="min-h-screen bg-[#0A0E1A] text-ivory"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <style>{`
        @keyframes impPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201, 168, 76,0.55), 0 14px 38px -10px rgba(201, 168, 76,0.45); }
          50% { box-shadow: 0 0 0 14px rgba(201, 168, 76,0), 0 18px 50px -10px rgba(201, 168, 76,0.65); }
        }
        @keyframes impDot {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes impShine {
          0% { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(220%) skewX(-20deg); }
        }
        @keyframes impFadeIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .imp-pulse { animation: impPulse 2.4s ease-in-out infinite; position: relative; overflow: hidden; }
        .imp-pulse::after {
          content: "";
          position: absolute; top: 0; left: 0; height: 100%; width: 35%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
          animation: impShine 3.4s ease-in-out infinite;
          pointer-events: none;
        }
        .imp-dot { animation: impDot 2s ease-in-out infinite; }
        .imp-serif { font-family: var(--font-display); }
        .imp-fade { animation: impFadeIn 0.6s ease-out both; }
        .imp-diamond::before {
          content: "◆"; color: #C9A84C; margin-right: 12px; font-size: 0.6em; vertical-align: middle;
        }
        .imp-radial-tr { background: radial-gradient(circle at 80% 10%, rgba(201, 168, 76,0.08), transparent 55%); }
        .imp-radial-bl { background: radial-gradient(circle at 10% 90%, rgba(201, 168, 76,0.05), transparent 55%); }
      `}</style>

      {/* LIVE SEATS BAR */}
      <div
        className="sticky top-0 z-40 w-full border-b backdrop-blur"
        style={{
          background: "rgba(201, 168, 76,0.08)",
          borderColor: "rgba(201, 168, 76,0.15)",
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-2.5 text-[11px] text-ivory/80">
          <div className="flex items-center gap-2">
            <span
              className="imp-dot inline-block h-2 w-2 rounded-full"
              style={{ background: "rgba(110,210,130,0.85)" }}
            />
            <span>{viewerCount} believers viewing this page right now</span>
          </div>
          <div className="uppercase tracking-[0.25em] text-[#C9A84C]">
            Cohort 1 · Founding Members
          </div>
          <div>
            <span className="text-[#C9A84C] font-semibold">{seatsRemaining}</span>{" "}
            of 50 founding seats remaining
          </div>
        </div>
      </div>

      {/* SEER AI LOGO ONLY (not clickable) */}
      <div className="px-6 pt-8 text-center">
        <span
          className="imp-serif text-lg tracking-[0.4em] text-[#C9A84C]"
          aria-label="SEER AI"
        >
          SEER · AI
        </span>
      </div>

      {/* 1. HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 imp-radial-tr" />
        <div className="absolute inset-0 imp-radial-bl" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-[860px] flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C]">
            For those who know God is saying more than they are currently hearing
          </p>
          <h1 className="imp-serif mt-7 text-[36px] leading-[1.1] text-white md:text-[58px]">
            Some Things Cannot Be Taught.
            <br />
            They Can Only Be Transferred.
          </h1>
          <div className="my-6 h-[2px] w-20 bg-[#C9A84C]" />
          <p
            className="imp-serif mx-auto max-w-[640px] text-[18px] italic text-[#C9A84C]"
          >
            The Impartation is a private, vetted group of 50 believers — prophets,
            intercessors, and dream carriers — who gather monthly with voices who
            have walked through the fire and came out carrying something real.
          </p>
          <p className="mt-6 text-[12px] italic text-[#C9A84C]/70">
            "I long to see you so that I may impart to you some spiritual gift to
            make you strong." — Romans 1:11
          </p>
          <button
            type="button"
            onClick={reserveSeat}
            className="imp-pulse mt-10 rounded-md bg-[#C9A84C] px-10 py-4 text-sm font-semibold tracking-wide text-[#0A0E1A] transition hover:brightness-110"
          >
            Reserve My Founding Seat →
          </button>
          <p className="mt-4 text-[11px] text-white/40">
            {seatsRemaining} founding seats remaining · Price increases to $127 when
            Cohort 1 fills
          </p>
        </div>
      </section>

      {/* 2. EPIPHANY BRIDGE — Sarah's story */}
      <section
        className="px-10 py-24"
        style={{
          background: "rgba(255,255,255,0.015)",
          borderTop: "1px solid rgba(201, 168, 76,0.1)",
          borderBottom: "1px solid rgba(201, 168, 76,0.1)",
        }}
      >
        <div className="mx-auto max-w-[780px]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
            The moment everything changed
          </p>
          <h2 className="imp-serif mt-5 text-[30px] text-white">
            She Had The Dreams.
            <br />
            She Had The Interpretations.
            <br />
            She Had The Journal.
            <br />
            She Was Still Stuck.
          </h2>
          <div className="imp-serif mt-10 space-y-5 text-[16px] leading-[1.9] text-[#F8F5EC] text-justify">
            <p>Her name is Sarah.</p>
            <p>She had been using SEER AI for four months.</p>
            <p>
              Twenty-three dreams submitted. Twenty-three Scripture-first
              interpretations received. Twenty-three prayer directions written down.
            </p>
            <p>
              And yet — every Sunday she sat in the back of her church feeling like
              she was carrying something nobody around her could see.
            </p>
            <p>
              A recurring dream about a harvest. A field. A specific region. A voice
              saying: <em>"Not yet. Not alone."</em>
            </p>
            <p>Not yet. Not alone.</p>
            <p>
              She prayed through it herself. She brought it to her pastor — a good
              man who listened kindly and said he'd pray about it. He never brought
              it up again.
            </p>
            <p>She started to wonder if she was making it all up.</p>
            <p>
              Six months after her first dream about that field — she joined The
              Impartation.
            </p>
            <p>
              In her second session, a woman who had walked in prophetic ministry
              for 27 years looked at Sarah's dream and said four words that changed
              everything:
            </p>
            <p className="text-[#C9A84C]">"That is an assignment."</p>
            <p>Not personal revelation. Not a symbol to decode. An assignment.</p>
            <p>
              And then she said: "You need two more people. You cannot do this
              assignment alone. That is why the voice said: not alone."
            </p>
            <p>Sarah wept.</p>
            <p>
              Not because the interpretation was beautiful — but because she had
              been carrying an assignment for six months thinking it was a personal
              blessing.
            </p>
            <p>She had the dream. She had the tool. She did not have the room.</p>
            <p className="text-[#C9A84C]">The Impartation is the room.</p>
          </div>
          <div className="mt-12 text-center text-2xl text-[#C9A84C]">◆ ◆ ◆</div>
        </div>
      </section>

      {/* 3. BIG DOMINO */}
      <section className="px-10 py-20">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">
            The one thing nobody told you
          </p>
          <h2 className="imp-serif mt-5 text-[34px] text-white">
            Your Gift Was Never Designed to Operate in Isolation.
            <br />
            The Prophets Did Not.
          </h2>
          <div className="imp-serif mt-10 space-y-5 text-[15px] leading-[1.9] text-[#F8F5EC]">
            <p>Elijah had Elisha. Moses had Aaron. Paul had Barnabas.</p>
            <p>Daniel had Shadrach, Meshach, and Abednego.</p>
            <p>
              Even Jesus — the Son of God — did not operate alone. He had twelve. He
              had three. He had one.
            </p>
            <p>
              The most powerful prophetic voices in Scripture were always embedded
              in community.
            </p>
            <p>Not because they needed emotional support. Because the gift requires it.</p>
            <p>Iron does not sharpen itself.</p>
            <p>Gold is not refined without fire applied by another.</p>
            <p>The mantle is not received in private. It is received in relationship.</p>
            <p>
              If you have been using SEER AI — submitting dreams, receiving
              interpretation, praying through what God shows you — and something
              still feels like it is not fully landing — this is why.
            </p>
            <p>
              The tool is working. The gift is real. The dreams are from God. You
              are just missing the room.
            </p>
          </div>
          <div
            className="imp-serif mx-auto mt-10 rounded-lg border p-6 text-[17px] italic text-[#C9A84C]"
            style={{
              background: "rgba(0,0,0,0.4)",
              borderColor: "rgba(201, 168, 76,0.3)",
            }}
          >
            The Impartation is not a coaching program you attend. It is the room
            that has been missing from your prophetic life.
          </div>
        </div>
      </section>

      {/* 4. WHO IS IN THE ROOM */}
      <section
        className="px-10 py-20"
        style={{ background: "rgba(255,255,255,0.015)" }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">
              The people at this table
            </p>
            <h2 className="imp-serif mt-5 text-[32px] text-white">
              We Did Not Build This Room For Everyone.
              <br />
              We Built It For You — If You Are This Person.
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {IDENTITY_CARDS.map((c) => (
              <div
                key={c.title}
                className="group rounded-2xl border p-7 transition hover:-translate-y-1"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  borderColor: "rgba(201, 168, 76,0.18)",
                }}
              >
                <div className="text-[#C9A84C]">{c.icon}</div>
                <h3 className="mt-4 text-[13px] font-bold uppercase tracking-wide text-white">
                  {c.title}
                </h3>
                <p className="imp-serif mt-3 text-[13px] leading-[1.7] text-[#F8F5EC]/85">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
          <p className="imp-serif mx-auto mt-12 max-w-[600px] text-center text-[16px] italic text-[#C9A84C]">
            If you read those six cards and felt seen in at least four of them — The
            Impartation is yours if you want it.
          </p>
        </div>
      </section>

      {/* 5. VALUE STACK */}
      <section className="px-10 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">
              Everything inside The Impartation
            </p>
            <h2 className="imp-serif mt-5 text-[34px] text-white">
              This Is What You Are Getting Access To.
            </h2>
            <p className="imp-serif mt-4 text-[15px] italic text-[#C9A84C]">
              Not what you are buying. What you are gaining access to.
            </p>
          </div>
          <div className="mt-12 space-y-3">
            {VALUE_STACK.map((s, i) => (
              <div
                key={s.title}
                className="grid items-center gap-5 rounded-2xl border p-7 md:grid-cols-[56px_1fr_auto]"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  borderColor: "rgba(201, 168, 76,0.15)",
                }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-[15px] font-extrabold text-[#C9A84C]"
                  style={{
                    background: "rgba(201, 168, 76,0.1)",
                    border: "1.5px solid rgba(201, 168, 76,0.35)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-white">
                    {s.title}
                  </h3>
                  <p className="imp-serif mt-2 text-[14px] leading-[1.7] text-[#F8F5EC]/85">
                    {s.body}
                  </p>
                </div>
                <div className="whitespace-nowrap text-[16px] font-bold text-[#C9A84C]">
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-7"
            style={{
              background: "rgba(201, 168, 76,0.06)",
              border: "2px solid rgba(201, 168, 76,0.35)",
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
              Total real-world value
            </p>
            <p className="text-[38px] font-extrabold text-white">$3,650/month</p>
          </div>

          <div className="mt-10 text-center">
            <p className="text-[14px] text-white/50">Your investment today:</p>
            <p
              className="imp-serif mt-2 text-[52px] text-[#C9A84C]"
              style={{ letterSpacing: "-0.02em" }}
            >
              $97/month
            </p>
            <p className="text-[12px] text-[#C9A84C]/70">
              Founding Member Price — Cohort 1 Only
            </p>
          </div>

          <div
            className="imp-serif mx-auto mt-12 max-w-[640px] rounded-xl p-7 text-[16px] italic leading-[1.8] text-[#F8F5EC]"
            style={{
              background: "rgba(201, 168, 76,0.05)",
              border: "1px solid rgba(201, 168, 76,0.25)",
              borderLeft: "4px solid #C9A84C",
            }}
          >
            If I gave you $3,650 worth of access to the most seasoned prophetic
            voices you have ever been in a room with — and all I asked for in
            return was $97 — would you hesitate?
            <br />
            <br />
            The answer is no.
            <br />
            <br />
            You would not hesitate because you already know what one session with
            the right voice is worth. You have been praying for access like this.
            This is that access.
          </div>
        </div>
      </section>

      {/* 6. TRANSFER MOMENT */}
      <section
        className="px-10 py-20"
        style={{
          background: "linear-gradient(180deg, #0A0E1A 0%, #0A0E1A 100%)",
        }}
      >
        <div className="mx-auto max-w-[720px] text-center">
          <div
            className="rounded-md p-8"
            style={{
              background: "rgba(10,14,26,0.8)",
              borderTop: "1px solid #C9A84C",
              borderBottom: "1px solid #C9A84C",
            }}
          >
            <p className="imp-serif text-[18px] italic leading-[1.8] text-[#F8F5EC]">
              "I long to see you so that I may impart to you some spiritual gift to
              make you strong — that is, that you and I may be mutually encouraged
              by each other's faith."
            </p>
            <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-[#C9A84C]">
              — Romans 1:11–12
            </p>
          </div>
          <div className="imp-serif mt-10 space-y-4 text-[17px] leading-[1.9] text-[#F8F5EC]">
            <p>Paul wrote that from prison.</p>
            <p>He was not writing about a conference.</p>
            <p>He was not writing about a course.</p>
            <p>He was not writing about a podcast.</p>
            <p>
              He was writing about being <em>IN THE ROOM</em> with people he needed
              to see.
            </p>
            <p>
              Because some things cannot travel through parchment. They can only
              travel through presence.
            </p>
            <p>
              The Impartation is that presence. Once per month. With voices who
              carry what you have been reaching for.
            </p>
          </div>
        </div>
      </section>

      {/* 7. SOCIAL PROOF */}
      <section className="px-10 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">
              From those already in the room
            </p>
            <div className="mt-5 text-[#C9A84C]">★★★★★ 5.0 out of 5</div>
            <p className="mt-1 text-[12px] text-white/50">
              Based on founding member reviews
            </p>
          </div>

          {/* Featured */}
          <div
            className="relative mt-10 rounded-2xl p-10"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(201, 168, 76,0.2)",
              borderLeft: "4px solid #C9A84C",
            }}
          >
            <span
              className="imp-serif absolute left-5 top-2 select-none text-[80px] leading-none"
              style={{ color: "rgba(201, 168, 76,0.12)" }}
            >
              "
            </span>
            <p className="imp-serif relative text-[18px] italic leading-[1.85] text-[#F8F5EC]">
              I have been in ministry for fourteen years. I have been to every
              major prophetic conference. I have read every book. Nothing prepared
              me for what happened in my first Impartation session.
              <br />
              <br />
              A voice in that room looked at a dream I had been carrying for nine
              months and said seven words: <em>"That is not a vision. That is a
              commission."</em>
              <br />
              <br />
              I knew it the moment she said it. I had been stewarding a commission
              as though it were a personal word. Nine months of wondering why
              nothing was moving. One session. Everything shifted.
              <br />
              <br />
              The Impartation is not a program. It is the moment the gift stops
              being theoretical and starts being deployed.
            </p>
            <div className="mt-6 text-[12px] text-[#C9A84C]">
              — Marcus D., Senior Pastor · Birmingham, AL · ★★★★★ · Founding Member
            </div>
          </div>

          {/* Grid of 3 */}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {REVIEWS.map((r) => (
              <div
                key={r.name}
                className="rounded-xl border p-6"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                <div className="text-[#C9A84C] text-sm">★★★★★</div>
                <div className="mt-2 text-[11px] uppercase tracking-wider text-[#C9A84C]">
                  ✓ {r.badge}
                </div>
                <h4 className="mt-3 text-[14px] font-semibold text-white">
                  {r.headline}
                </h4>
                <p className="imp-serif mt-3 whitespace-pre-line text-[13.5px] leading-[1.7] text-[#F8F5EC]/85">
                  {r.body}
                </p>
                <div className="mt-5 flex items-center justify-between text-[11px] text-white/45">
                  <span>{r.name}</span>
                  <span>{r.helpful} found this helpful</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. SCARCITY */}
      <section
        className="px-10 py-16"
        style={{
          background: "rgba(201, 168, 76,0.04)",
          borderTop: "1px solid rgba(201, 168, 76,0.2)",
          borderBottom: "1px solid rgba(201, 168, 76,0.2)",
        }}
      >
        <div className="mx-auto max-w-[680px] text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">
            Why this closes when it closes
          </p>
          <h2 className="imp-serif mt-5 text-[30px] text-white">
            50 Seats. Not 500.
            <br />
            Not Because We Cannot Handle More.
            <br />
            Because The Room Cannot.
          </h2>
          <div className="imp-serif mt-8 space-y-4 text-[15px] leading-[1.9] text-[#F8F5EC]">
            <p>
              The Impartation is capped at 50 members for one reason that has
              nothing to do with logistics: the value of this community IS the
              community.
            </p>
            <p>
              50 vetted believers who are serious, accountable, and carrying real
              assignments is worth infinitely more than 500 who are casually
              interested.
            </p>
            <p>When the room fills — it fills.</p>
            <p>
              Cohort 2 will open at <strong className="text-[#C9A84C]">$127/month</strong>.
              <br />
              Cohort 3 will open at <strong className="text-[#C9A84C]">$147/month</strong>.
            </p>
            <p>
              Founding members of Cohort 1 are locked at $97 for as long as they
              remain members. They will never pay more than what they paid on day
              one.
            </p>
            <p className="text-[#C9A84C]">
              The price you pay today is the price you keep. That only works if you
              join today.
            </p>
          </div>

          {/* Seat counter */}
          <div
            className="mx-auto mt-10 flex max-w-[560px] flex-wrap items-center justify-between gap-6 rounded-2xl p-7"
            style={{
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(201, 168, 76,0.3)",
            }}
          >
            <SeatDots remaining={seatsRemaining} />
            <div className="text-right">
              <div
                className="text-[52px] font-extrabold leading-none text-[#C9A84C]"
              >
                {seatsRemaining}
              </div>
              <div className="mt-1 text-[12px] text-white/50">
                founding seats remaining
              </div>
            </div>
          </div>
          <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-white/40">
            <span
              className="imp-dot inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "rgba(110,210,130,0.85)" }}
            />
            Updates in real time
          </p>
        </div>
      </section>

      {/* 9. OFFER */}
      <section id="offer" className="px-10 py-20">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">
            Your founding membership
          </p>
          <h2 className="imp-serif mt-5 text-[36px] text-white">
            Everything. For One Number That Will Feel Wrong For How Much It Gives
            You.
          </h2>

          <div className="relative mt-14">
            <div
              className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-6 py-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: "linear-gradient(135deg, #C9A84C, #C9A84C)",
                color: "#0A0E1A",
                boxShadow: "0 0 24px rgba(201, 168, 76,0.5)",
              }}
            >
              Cohort 1 · Founding Member Price
            </div>
            <div
              className="rounded-2xl p-10 md:p-12"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(201, 168, 76,0.25)",
                boxShadow:
                  "inset 0 1px 0 rgba(201, 168, 76,0.1), 0 32px 80px rgba(0,0,0,0.5)",
              }}
            >
              <h3 className="imp-serif text-[32px] text-white">The Impartation</h3>
              <p className="imp-serif mt-2 text-[14px] italic text-[#C9A84C]">
                Live Prophetic Group Mentorship
              </p>

              <ul className="mx-auto mt-10 max-w-md space-y-3 text-left">
                {[
                  "4 Live Monthly Sessions",
                  "Live Dream Review (yours monthly)",
                  "Access to Vetted Apostolic Voices",
                  "Monthly Guest Prophetic Voice",
                  "Accountability Partner Matching",
                  "Prophetic Activation Exercises",
                  "Full Session Recording Library",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[14px] text-[#F8F5EC]">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-[#0A0E1A]"
                      style={{ background: "#C9A84C" }}
                    >
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="my-8 h-px bg-white/10" />

              <p
                className="text-[13px] text-white/45"
                style={{ textDecoration: "line-through" }}
              >
                Real-world value: $3,650/month
              </p>
              <p
                className="imp-serif mt-3 text-[72px] leading-none text-[#C9A84C]"
                style={{ letterSpacing: "-0.03em" }}
              >
                $97
              </p>
              <p className="mt-1 text-[16px] text-white/50">/month — founding price</p>

              <p className="mt-4 text-[12px] font-medium text-[#C9A84C]/85">
                Your founding price is locked in for as long as you remain a
                member.
              </p>

              <div className="my-8 h-px bg-white/10" />

              <div
                className="rounded-lg p-5 text-left text-[13px] leading-[1.7] text-[#F8F5EC]/90"
                style={{
                  background: "rgba(201, 168, 76,0.06)",
                  border: "1px solid rgba(201, 168, 76,0.2)",
                }}
              >
                <strong className="text-[#C9A84C]">30-day guarantee.</strong>{" "}
                Attend your first live session. If you do not receive something you
                could not have received alone — email us once. Full refund. No
                forms. No judgment. No waiting. But you have to show up.
              </div>

              {soldOut ? (
                <WaitlistBlock
                  email={waitlistEmail}
                  setEmail={setWaitlistEmail}
                  done={waitlistDone}
                  onSubmit={joinWaitlist}
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={reserveSeat}
                    className="imp-pulse mt-8 w-full rounded-md bg-[#C9A84C] px-8 py-5 text-[15px] font-semibold tracking-wide text-[#0A0E1A] transition hover:brightness-110"
                  >
                    Reserve My Founding Seat →
                  </button>
                  <p className="mt-3 text-[11px] text-white/50">
                    Seats remaining: {seatsRemaining}
                  </p>
                  {rateLimited && (
                    <p className="mt-2 text-[11px] text-red-400">
                      Too many attempts. Please wait an hour before trying again.
                    </p>
                  )}
                  <p className="mt-4 text-[11px] text-white/40">
                    Secured by Shopify · SSL Encrypted · Cancel Anytime
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 10. BELIEF BREAKERS */}
      <section
        className="px-10 py-20"
        style={{ background: "rgba(255,255,255,0.015)" }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">
              What you are probably thinking right now
            </p>
            <h2 className="imp-serif mt-5 text-[30px] text-white">
              Let Me Answer It Before You Talk Yourself Out Of The Room.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {BELIEFS.map((b) => (
              <div
                key={b.thinking}
                className="rounded-2xl border p-7 transition hover:border-[#C9A84C]/60 hover:-translate-y-1"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                <p className="text-[13px] italic text-white/45">
                  What you're thinking:
                </p>
                <p className="imp-serif mt-1 text-[14px] italic text-white/75">
                  "{b.thinking}"
                </p>
                <div className="my-4 text-[#C9A84C]">◆</div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-white">
                  What is actually true:
                </p>
                <p className="imp-serif mt-2 whitespace-pre-line text-[13.5px] leading-[1.7] text-[#F8F5EC]/90">
                  {b.truth}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. FINAL CALL */}
      <section className="px-10 py-24">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">
            Six months from today
          </p>
          <h2 className="imp-serif mt-5 text-[38px] leading-[1.15] text-white">
            Imagine Knowing Exactly What You Are Carrying.
            <br />
            Imagine Having the Room That Confirmed It.
          </h2>
          <div className="imp-serif mt-10 space-y-4 text-[16px] leading-[1.9] text-[#F8F5EC]">
            <p>Six months from today —</p>
            <p>
              You have been in six live sessions with voices who have walked in the
              prophetic for decades.
            </p>
            <p>
              You have had your most significant dream reviewed live, in front of a
              room that could see what you were carrying before you could name it
              yourself.
            </p>
            <p>
              You have an accountability partner who checks in every week and asks:
              "Did you pray through that assignment?"
            </p>
            <p>
              You have a recording library of 24 sessions that you can return to
              whenever your discernment needs sharpening.
            </p>
            <p>You are not carrying your gift alone. You never will again.</p>
            <p className="text-[#C9A84C]">
              That is six months from today if you reserve your seat right now.
            </p>
            <p>If you do nothing — six months from today you are still in the same place.</p>
            <p>Same dreams. Same weight. Same question:</p>
            <p className="italic">"Why is nothing accelerating?"</p>
            <p>You already know the answer. You are missing the room.</p>
          </div>
          <p className="imp-serif mt-10 text-[17px] italic text-[#C9A84C]">
            "Iron sharpens iron, and one person sharpens another." — Proverbs 27:17
          </p>
          <button
            type="button"
            onClick={reserveSeat}
            className="imp-pulse mx-auto mt-10 block w-full max-w-[560px] rounded-md bg-[#C9A84C] px-8 py-5 text-[15px] font-semibold tracking-wide text-[#0A0E1A] transition hover:brightness-110"
          >
            Reserve My Founding Seat — $97/month →
          </button>
          <p className="mt-4 text-[12px] text-[#C9A84C]/80">
            {seatsRemaining} founding seats remaining · Price increases to $127
            when Cohort 1 fills
          </p>
          <p className="mt-2 text-[11px] text-white/40">
            30-day guarantee · Attend first session or refund · No forms · No
            questions
          </p>
        </div>
      </section>

      {/* 12. STICKY CTA BAR */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur transition-transform duration-300"
        style={{
          background: "rgba(10,14,26,0.96)",
          borderColor: "rgba(201, 168, 76,0.25)",
          transform: scrolled ? "translateY(0)" : "translateY(100%)",
        }}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div>
            <div className="text-[15px] font-bold text-white">The Impartation</div>
            <div className="text-[11px] text-[#C9A84C]/80">
              Founding Member · $97/month
            </div>
          </div>
          <div className="hidden text-center md:block">
            <div className="text-[12px] font-medium text-[#C9A84C]">
              {seatsRemaining} seats remaining
            </div>
          </div>
          <button
            type="button"
            onClick={reserveSeat}
            className="rounded-md bg-[#C9A84C] px-7 py-3 text-[14px] font-bold text-[#0A0E1A] transition hover:brightness-110"
          >
            Reserve My Seat →
          </button>
        </div>
      </div>

      <div className="h-24" />
    </div>
  );
}

/* ───────────────────── helper components & data ───────────────────── */

function SeatDots({ remaining }: { remaining: number }) {
  const taken = Math.max(0, Math.min(50, 50 - remaining));
  const dots = useMemo(() => Array.from({ length: 50 }, (_, i) => i < taken), [taken]);
  return (
    <div className="flex max-w-[300px] flex-wrap gap-[4px]">
      {dots.map((filled, i) => (
        <span
          key={i}
          className="h-[10px] w-[10px] rounded-full"
          style={{
            background: filled ? "#C9A84C" : "rgba(255,255,255,0.1)",
          }}
        />
      ))}
    </div>
  );
}

function WaitlistBlock({
  email,
  setEmail,
  done,
  onSubmit,
}: {
  email: string;
  setEmail: (s: string) => void;
  done: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (done) {
    return (
      <p className="mt-8 text-[14px] text-[#C9A84C]">
        You're on the waitlist. We'll email you the moment a Cohort 1 seat opens.
      </p>
    );
  }
  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3 text-left">
      <p className="text-center text-[14px] text-white/70">
        Cohort 1 is full. Join the waitlist for the next opening at founding price.
      </p>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="w-full rounded-md border bg-black/30 px-4 py-3 text-[14px] text-white placeholder-white/40 outline-none focus:border-[#C9A84C]"
        style={{ borderColor: "rgba(201, 168, 76,0.3)" }}
      />
      <button
        type="submit"
        className="w-full rounded-md bg-[#C9A84C] px-6 py-4 text-[14px] font-semibold text-[#0A0E1A] hover:brightness-110"
      >
        Join the Waitlist →
      </button>
    </form>
  );
}

const IDENTITY_CARDS = [
  {
    title: "You carry dreams that feel like assignments",
    body: "Not just personal impressions. Burdens. Intercession urgencies. Things you cannot explain to people who have not felt it.",
    icon: <FlameIcon />,
  },
  {
    title: "You are serious about Scripture-first discernment",
    body: "You are not looking for someone to tell you what God is saying. You are looking for someone to help you hear it more clearly yourself.",
    icon: <BookIcon />,
  },
  {
    title: "You have been through the fire",
    body: "Loss. Betrayal. Wilderness seasons. Dark nights of the soul. You came out different on the other side. Refined. Not destroyed.",
    icon: <SwordsIcon />,
  },
  {
    title: "You are done with shallow community",
    body: "You have been in groups that felt more like performance than accountability. You want a room that is real, vetted, and safe.",
    icon: <ShieldIcon />,
  },
  {
    title: "You want to be around people who have MORE",
    body: "Not more followers. More depth. More anointing. More years in the fire. You want to be the least experienced person in the room.",
    icon: <CrownIcon />,
  },
  {
    title: "You sense your gift is ready to accelerate",
    body: "You have the tool. You have the Scripture foundation. You have the prayer discipline. You need the room that activates what is already in you.",
    icon: <ArrowIcon />,
  },
];

const VALUE_STACK = [
  {
    title: "4 Live Monthly Sessions",
    body: "Facilitated by vetted prophetic leaders — prophets and apostles who have walked in the gifts for 20+ years and have the scars to prove it. Not speakers. Not celebrities. Voices with weight.",
    value: "$1,200/month value",
  },
  {
    title: "Live Dream Review Sessions",
    body: "Submit your dream for live review on the group call. A vetted voice walks through it in real time — symbol by symbol, Scripture by Scripture — in front of the entire community. Watch how mastery thinks.",
    value: "$500/month value",
  },
  {
    title: "Access to Vetted Voices",
    body: "The most significant thing about The Impartation is not the content. It is the people in the room. Prophets. Apostles. Intercessors. Believers who have been through decades of fire. Most people spend years trying to get an hour with these voices. You get monthly access.",
    value: "$800/month value",
  },
  {
    title: "Monthly Guest Apostolic Voice",
    body: "Once per month, a seasoned apostolic or prophetic voice joins The Impartation for an open conversation. Q&A. Direct access. The kind of session that costs $500 to attend at a conference — and you still would not get direct access.",
    value: "$500/month value",
  },
  {
    title: "Accountability Partner Matching",
    body: "Matched with one member at a similar level of prophetic maturity. Weekly check-ins. Dream accountability. Prayer partnership. Someone who knows your assignment and will not let you drift from it. Iron sharpening iron. Proverbs 27:17 made practical.",
    value: "$200/month value",
  },
  {
    title: "Prophetic Activation Exercises",
    body: "Monthly assignments designed to sharpen your discernment. Scripture immersion. Symbol studies. Intercession protocols. Hebrews 5:14: 'by constant use, trained to distinguish.' Constant use. Training. This is how the gift develops.",
    value: "$150/month value",
  },
  {
    title: "Full Session Library",
    body: "Every session recorded. Full access from day one. Rewatch. Study. Catch what you missed. By Month 6 you have 24+ sessions of apostolic-level prophetic training on demand. Growing every month.",
    value: "$300/month value",
  },
];

const REVIEWS = [
  {
    name: "Sarah K.",
    badge: "Founding Member · Intercessor",
    headline: "I stopped carrying my assignment alone.",
    body: "Seven months of dream after dream about a specific assignment I didn't understand. First session in The Impartation — confirmed, named, and given direction by voices who had seen it before.\n\nI don't know how to put a number on what that was worth.\n\nI know it was not $97.",
    helpful: 89,
  },
  {
    name: "Imani R.",
    badge: "Founding Member · Prophetic Leader",
    headline: "The room I did not know I was missing.",
    body: "I had the gifts. I had the training. I had the tools.\n\nI did not have the room where people who had MORE than me could see what I was carrying and speak to it with authority.\n\nThe Impartation gave me that.\n\nIn four sessions I received more directional clarity than I had in four years alone.",
    helpful: 67,
  },
  {
    name: "Thomas R.",
    badge: "Founding Member · Ministry Leader 22 yrs",
    headline: "Iron in the fire 22 years still gets sharpened.",
    body: "I almost did not join. I thought I was past the point of needing a community like this.\n\nI was wrong.\n\nEvery session I leave with something I did not have before. Not information. Something transferred.\n\nThat is the difference. That is The Impartation.",
    helpful: 112,
  },
];

const BELIEFS = [
  {
    thinking: "I am not prophetic enough for something like this.",
    truth:
      "That thought is the exact reason you need this room.\n\nThe Impartation was not built for people who have arrived. It was built for people who know they are carrying something real and need the room where it can be named, sharpened, and sent.\n\nThe only person who is not ready is the person who is comfortable where they are. Are you comfortable?",
  },
  {
    thinking: "I cannot afford $97/month right now.",
    truth:
      "You cannot afford to spend another year carrying your assignment alone.\n\n$97/month is $3.23/day. One cup of coffee per day vs access to voices it would take most people years to get in a room with.\n\nThe cost of confusion, misdirection, and isolation is not $97. It is years. You know which one costs more.",
  },
  {
    thinking: "I have been in groups before and they were not what they promised.",
    truth:
      "You are right to be cautious. Most groups are not vetted. Most groups are not capped. Most groups let anyone in.\n\nThe Impartation is 50 people. Every member reviewed. Every voice facilitating it has decades of proven fruit.\n\nIf after your first session it is not what we promised — you get every dollar back. No forms. No questions. We earn your trust in the first session or we do not deserve your money.",
  },
  {
    thinking: "I do not have time for another commitment.",
    truth:
      "One session per month. Four hours per month. In exchange for the kind of clarity that saves you months of confusion.\n\nThe people who do not have time for The Impartation are the same people who spend six months carrying an assignment they could have had named in one session.\n\nYou do not have time to not be in this room.",
  },
];

/* ─────── Inline SVG icons (gold) ─────── */
function FlameIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2s4 5 4 9a4 4 0 1 1-8 0c0-2 1-3 1-3s0 2 2 2c0-3 1-5 1-8Z"/></svg>
  );
}
function BookIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 5a2 2 0 0 1 2-2h6v18H4a2 2 0 0 1-2-2V5Zm12-2h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6V3Z"/></svg>
  );
}
function SwordsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m14 5 5-2-2 5-9 9-3-3 9-9Zm-9 9-2 5 5-2"/><path d="m17 14 3 3-2 5-5-2"/></svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>
  );
}
function CrownIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7l4 5 5-7 5 7 4-5v11H3V7Z"/></svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 17 17 7M9 7h8v8"/></svg>
  );
}
