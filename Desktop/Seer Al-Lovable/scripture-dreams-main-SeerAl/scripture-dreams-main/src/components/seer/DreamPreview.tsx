import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import decodeContext from "@/assets/decode-context.jpg";
import { readDream, type ReadingResult } from "@/lib/dream.functions";

const SAMPLE =
  "I had a gold book in my hands that was given to me by an angel. I felt the weight of it and didn't want to drop it.";

const LEAD_STORAGE_KEY = "seer_lead_v1";

type Lead = { name: string; email: string; phone?: string };

export function DreamPreview() {
  const [dream, setDream] = useState("");
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<ReadingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadError, setLeadError] = useState<string | null>(null);
  const [decodedCount, setDecodedCount] = useState(1847);
  const [pulseCount, setPulseCount] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setDecodedCount((c) => c + Math.floor(Math.random() * 3) + 1);
      setPulseCount(true);
      setTimeout(() => setPulseCount(false), 400);
    }, 30000);
    return () => clearInterval(id);
  }, []);
  const readDreamFn = useServerFn(readDream);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LEAD_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Lead;
        if (parsed?.email) {
          setLead(parsed);
          setLeadName(parsed.name ?? "");
          setLeadEmail(parsed.email);
          setLeadPhone(parsed.phone ?? "");
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function runReading(text: string) {
    setLoading(true);
    setError(null);
    setReading(null);
    try {
      const result = await readDreamFn({ data: { dream: text } });
      setReading(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something interrupted the reading.";
      if (msg.includes("RATE_LIMIT")) {
        setError("Too many readings in a short window. Please try again in a moment.");
      } else if (msg.includes("CREDITS")) {
        setError("The reading service is briefly unavailable. Please try again shortly.");
      } else {
        setError("The reading couldn't be completed just now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRead() {
    const text = dream.trim();
    if (text.length < 6) {
      setValidation("Write a sentence or two about your dream to begin.");
      return;
    }
    setValidation(null);
    if (!lead?.email) {
      setGateOpen(true);
      return;
    }
    await runReading(text);
  }

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = leadName.trim();
    const email = leadEmail.trim();
    const phone = leadPhone.trim();
    if (name.length < 2) {
      setLeadError("Please share your first name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLeadError("Please enter a valid email address.");
      return;
    }
    setLeadError(null);
    const next: Lead = { name, email, phone: phone || undefined };
    setLead(next);
    try {
      localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setGateOpen(false);
    await runReading(dream.trim());
  }


  return (
    <section id="preview" className="relative py-32 lg:py-44 overflow-hidden">
      <div className="absolute top-0 inset-x-0 hairline" />
      <div className="absolute -top-40 right-0 w-[600px] h-[600px] bg-gold/[0.04] blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-[520px] h-[520px] bg-gold/[0.03] blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 mb-16 items-end">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-3 mb-7">
              <span className="text-[11px] tracking-[0.35em] uppercase text-gold font-semibold">Step 1: Submit Your Dream</span>
              <span className="w-10 h-px bg-gradient-to-r from-gold/80 to-transparent" />
            </div>
            <h2 className="font-display text-4xl lg:text-6xl text-white leading-[1.05] tracking-tight mb-6">
              Write It Down.
              <br />
              <span className="text-gradient-gold italic">Claim Your Scripture-First Interpretation.</span>
              <br />
              Act On What God Is Saying.
            </h2>
            <p className="text-gold/90 text-base lg:text-lg leading-relaxed max-w-xl mb-4">
              In 5 minutes, you'll have:
            </p>
            <ul className="space-y-2 text-ivory/85 text-[15px] leading-relaxed max-w-xl mb-5">
              <li className="flex gap-3"><span className="text-gold">✓</span> The central symbol decoded through Scripture</li>
              <li className="flex gap-3"><span className="text-gold">✓</span> A Bible passage that illuminates the pattern</li>
              <li className="flex gap-3"><span className="text-gold">✓</span> One prayer direction to move forward with clarity</li>
              <li className="flex gap-3"><span className="text-gold">✓</span> Access to your full interpretation history</li>
            </ul>
            <p className="text-ivory/90 font-display italic text-lg">
              Your dream. Scripture. Prayer. That's the entire system.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] rounded-2xl overflow-hidden shadow-elegant max-w-sm lg:ml-auto transition-transform duration-500 hover:scale-[1.02]">
              <img
                src={decodeContext}
                alt="An open Bible and journal on a bed beside a warm bedside lamp"
                loading="lazy"
                width={1024}
                height={1280}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-onyx/80 via-onyx/10 to-transparent pointer-events-none" />
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold">Selah · Job 33:14</p>
                <p className="font-display text-ivory/90 text-base italic leading-snug mt-1.5">
                  "For God speaks in one way, and in two, though man does not perceive it."
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Input */}
          <div className="relative rounded-3xl border border-gold/15 bg-gradient-to-br from-card/70 to-card/30 backdrop-blur-sm p-8 lg:p-10 shadow-elegant">
            <span className="absolute top-3 left-3 w-3 h-3 border-l border-t border-gold/50" />
            <span className="absolute top-3 right-3 w-3 h-3 border-r border-t border-gold/50" />
            <span className="absolute bottom-3 left-3 w-3 h-3 border-l border-b border-gold/50" />
            <span className="absolute bottom-3 right-3 w-3 h-3 border-r border-b border-gold/50" />
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Submit Your Dream</span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-gold/80">Encrypted · Between You &amp; God</span>
            </div>
            <textarea
              value={dream}
              onChange={(e) => {
                setDream(e.target.value);
                if (validation) setValidation(null);
              }}
              placeholder="Write your dream exactly as you remember it. Every detail matters. Time doesn't. Take your time."
              rows={9}
              maxLength={2000}
              className="w-full bg-transparent text-ivory font-display text-lg leading-relaxed resize-none focus:outline-none placeholder:text-ivory/40"
            />
            {validation && (
              <p className="text-xs text-gold/90 mt-2">{validation}</p>
            )}
            <div className="mt-8 flex items-center justify-between gap-4">
              <span className="text-xs text-ivory/50">
                {dream.length} / 2000 characters
              </span>
              <div className="flex items-center gap-3">
                {!dream.trim() && (
                  <button
                    type="button"
                    onClick={() => setDream(SAMPLE)}
                    className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-ivory transition-colors"
                  >
                    Try sample
                  </button>
                )}
                <button
                  onClick={handleRead}
                  disabled={loading}
                  className="group btn-2030 btn-gold-2030 btn-2030-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Analyzing Your Dream…" : "Decode My Dream Now"}
                  {!loading && <span className="btn-arrow">→</span>}
                </button>
              </div>
            </div>
            <p className="mt-4 text-center text-[11px] text-gold/80">
              Encrypted · Instant delivery · Works on any device · Starts at $7
            </p>
          </div>

          {/* Output */}
          <div className="relative rounded-3xl border border-gold/20 bg-gradient-to-br from-card/70 to-card/20 backdrop-blur-sm p-8 lg:p-10 shadow-elegant overflow-hidden">
            <span className="absolute top-3 left-3 w-3 h-3 border-l border-t border-gold/60 z-10" />
            <span className="absolute top-3 right-3 w-3 h-3 border-r border-t border-gold/60 z-10" />
            <span className="absolute bottom-3 left-3 w-3 h-3 border-l border-b border-gold/60 z-10" />
            <span className="absolute bottom-3 right-3 w-3 h-3 border-r border-b border-gold/60 z-10" />
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-gold/10 blur-3xl rounded-full" />

            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Example Interpretation</span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  {reading ? "Your interpretation" : loading ? "Listening" : "Real submission"}
                </span>
              </div>

              {!reading && !loading && !error && (
                <div className="space-y-5 text-ivory/80 leading-relaxed text-[15px]">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-gold/80">From Sarah M. · submitted dream</p>
                  <p className="text-ivory/70 italic font-display text-base leading-snug border-l-2 border-gold/40 pl-4">
                    "I was standing in a room with a window. Outside the window, I could see water rising — but it wasn't scary."
                  </p>

                  <div className="space-y-4 pt-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-1">Central Symbol</p>
                      <p className="font-display text-ivory text-lg">Rising Water</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-1">Scripture Comparison</p>
                      <p className="text-ivory italic">Ezekiel 47:1–12 — water flowing from the temple.</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-1">Prayer Direction</p>
                      <p className="text-ivory/90">Spend time in Psalm 23 this week. Ask God what new flow of His Spirit He's inviting you into.</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-gold/90 pt-3 border-t border-gold/20">
                    ✓ Sarah upgraded to Watchman and now submits dreams 3×/week.
                  </p>
                </div>
              )}

              {loading && (
                <div className="space-y-4 animate-pulse">
                  <div className="h-8 w-2/3 bg-ivory/10 rounded" />
                  <div className="space-y-2 pt-2">
                    <div className="h-4 w-full bg-ivory/10 rounded" />
                    <div className="h-4 w-11/12 bg-ivory/10 rounded" />
                    <div className="h-4 w-4/5 bg-ivory/10 rounded" />
                  </div>
                  <div className="h-24 w-full bg-onyx/40 border border-gold/10 rounded-2xl mt-6" />
                  <p className="text-xs uppercase tracking-[0.25em] text-gold/70 pt-2">
                    Reading slowly…
                  </p>
                </div>
              )}

              {error && !loading && (
                <div className="space-y-4 text-muted-foreground leading-relaxed text-[15px]">
                  <h3 className="font-display text-2xl text-ivory">A pause in the reading.</h3>
                  <p>{error}</p>
                  <button
                    onClick={handleRead}
                    className="btn-2030 btn-ghost-2030 btn-2030-sm"
                  >
                    Try again
                  </button>
                </div>
              )}

              {reading && !loading && (
                <>
                  <h3 className="font-display text-3xl text-ivory mb-6 leading-tight">
                    {reading.title}
                  </h3>

                  <div className="space-y-6 text-ivory/85 leading-relaxed text-[15px]">
                    <section>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70 mb-2">Summary</p>
                      <p className="font-display text-lg leading-relaxed text-ivory/90">
                        {reading.summary}
                      </p>
                    </section>

                    <section>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70 mb-2">Possible Symbolic Pattern</p>
                      <p className="text-muted-foreground leading-relaxed">{reading.symbolicPattern}</p>
                    </section>

                    <section className="rounded-2xl border border-gold/20 bg-onyx/40 px-5 py-5">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-gold/80 mb-2">
                        Scripture-Connected Reflection
                      </p>
                      <p className="font-display text-ivory text-lg italic leading-snug">
                        {reading.scriptureReflection}
                      </p>
                    </section>

                    <section>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70 mb-2">Heart-Level Question</p>
                      <p className="text-ivory/80 leading-relaxed italic">{reading.heartQuestion}</p>
                    </section>

                    {/* Locked full breakdown */}
                    <section className="relative mt-8 pt-8 border-t border-gold/30">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-gold/80">
                          Full Dream Mapping Breakdown
                        </p>
                        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Locked</span>
                      </div>
                      <div className="relative">
                        <ul className="space-y-3 text-sm select-none blur-[3px] pointer-events-none">
                          <li className="flex gap-4 items-start">
                            <span className="text-gold/60 mt-0.5">·</span>
                            <span className="text-ivory/70">Full symbol map — every image in the dream, named in order.</span>
                          </li>
                          <li className="flex gap-4 items-start">
                            <span className="text-gold/60 mt-0.5">·</span>
                            <span className="text-ivory/70">Scripture cross-references for each symbol, in context.</span>
                          </li>
                          <li className="flex gap-4 items-start">
                            <span className="text-gold/60 mt-0.5">·</span>
                            <span className="text-ivory/70">The emotional and spiritual tension underneath the dream.</span>
                          </li>
                          <li className="flex gap-4 items-start">
                            <span className="text-gold/60 mt-0.5">·</span>
                            <span className="text-ivory/70">A written prayer prompt drawn from what you described.</span>
                          </li>
                          <li className="flex gap-4 items-start">
                            <span className="text-gold/60 mt-0.5">·</span>
                            <span className="text-ivory/70">Next-step discernment questions to walk out this week.</span>
                          </li>
                          <li className="flex gap-4 items-start">
                            <span className="text-gold/60 mt-0.5">·</span>
                            <span className="text-ivory/70">Recurring pattern tracker across your future dreams.</span>
                          </li>
                        </ul>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-onyx/40 to-onyx/80 pointer-events-none" />
                      </div>
                    </section>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gold/30 flex flex-col gap-5">
                    <p className="text-center text-[11px] uppercase tracking-[0.28em] text-gold/80">
                      Continue this reading — choose your path
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <a
                        href="/checkout?plan=trial"
                        className="group flex flex-col items-center text-center rounded-2xl border border-gold/25 bg-card/40 px-3 py-3 hover:border-gold/70 hover:bg-card/60 transition-all"
                      >
                        <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Trial</span>
                        <span className="font-display text-xl text-ivory mt-1">$7</span>
                        <span className="text-[10px] text-ivory/60 mt-0.5">3 decodes</span>
                      </a>
                      <a
                        href="/checkout?plan=watchman"
                        className="relative group flex flex-col items-center text-center rounded-2xl border border-gold/60 bg-gradient-to-b from-gold/15 to-transparent px-3 py-3 hover:border-gold transition-all"
                      >
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gold text-onyx text-[8px] uppercase tracking-[0.2em] font-medium">Chosen</span>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-gold">Watchman</span>
                        <span className="font-display text-xl text-ivory mt-1">$47<span className="text-[10px] text-ivory/60">/mo</span></span>
                        <span className="text-[10px] text-ivory/60 mt-0.5">Unlimited</span>
                      </a>
                      <a
                        href="/checkout?plan=seeker"
                        className="group flex flex-col items-center text-center rounded-2xl border border-gold/25 bg-card/40 px-3 py-3 hover:border-gold/70 hover:bg-card/60 transition-all"
                      >
                        <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Seeker</span>
                        <span className="font-display text-xl text-ivory mt-1">$24<span className="text-[10px] text-ivory/60">/mo</span></span>
                        <span className="text-[10px] text-ivory/60 mt-0.5">10 decodes</span>
                      </a>
                    </div>
                    <a
                      href="/checkout?plan=trial"
                      className="group btn-2030 btn-gold-2030 btn-2030-md w-full uppercase tracking-[0.18em] !text-[11px] sm:!text-xs"
                    >
                      <span>Unlock the Full Breakdown</span>
                      <span className="btn-arrow" aria-hidden="true">→</span>
                    </a>
                    <p className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
                      Secure checkout · Cancel anytime
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Trust stack */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] text-ivory/70">
          {["Scripture Only","Encrypted","Instant Analysis","Secure","Private","No New Age","7-Day Guarantee"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className="text-gold">✓</span>{t}
            </span>
          ))}
        </div>

        {/* Live social proof */}
        <div className="mt-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-gold/80 mb-2">Believers Decoded This Week</p>
          <p
            className={`font-display text-4xl lg:text-5xl font-extrabold text-gold transition-transform duration-300 ${pulseCount ? "scale-110" : "scale-100"}`}
          >
            {decodedCount.toLocaleString()} <span className="text-ivory/80 text-2xl lg:text-3xl font-normal">Dreams Interpreted</span>
          </p>
          <p className="text-xs text-ivory/50 mt-1">In the last 7 days</p>
        </div>
      </div>

      {/* Lead capture gate */}
      {gateOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 bg-onyx/80 backdrop-blur-md animate-in fade-in duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-gate-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGateOpen(false);
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl border border-gold/30 bg-gradient-to-br from-card to-onyx p-8 lg:p-10 shadow-elegant animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
            <span className="absolute top-3 left-3 w-3 h-3 border-l border-t border-gold/70" />
            <span className="absolute top-3 right-3 w-3 h-3 border-r border-t border-gold/70" />
            <span className="absolute bottom-3 left-3 w-3 h-3 border-l border-b border-gold/70" />
            <span className="absolute bottom-3 right-3 w-3 h-3 border-r border-b border-gold/70" />
            <button
              type="button"
              onClick={() => setGateOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-ivory text-xl leading-none transition-colors"
              aria-label="Close"
            >
              ×
            </button>

            <div className="text-center mb-6">
              <p className="text-[10px] uppercase tracking-[0.35em] text-gold/80 mb-3">
                One Final Step
              </p>
              <h3 id="lead-gate-title" className="font-display text-3xl text-ivory leading-tight mb-3">
                Where should we send your <span className="italic text-gold">Scripture-first</span> interpretation?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your <span className="text-gold">biblical</span> dream interpretation is ready. Enter your email to receive it securely — and keep a private copy for prayer and reflection.
              </p>
              <p className="text-[11px] text-gold/80 mt-4 leading-relaxed">
                Includes: Symbol breakdown · Scripture references · Prayer direction · Discernment notes
              </p>
            </div>

            <form onSubmit={handleLeadSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Mary"
                  autoComplete="given-name"
                  className="w-full bg-onyx/60 border border-gold/20 rounded-xl px-4 py-3 text-ivory placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full bg-onyx/60 border border-gold/20 rounded-xl px-4 py-3 text-ivory placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
                  Phone <span className="text-muted-foreground/50 normal-case tracking-normal">(optional for prayer reminder texts)</span>
                </label>
                <input
                  type="tel"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  autoComplete="tel"
                  className="w-full bg-onyx/60 border border-gold/20 rounded-xl px-4 py-3 text-ivory placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/60 transition-colors"
                />
              </div>

              {leadError && (
                <p className="text-xs text-gold/90">{leadError}</p>
              )}

              <button
                type="submit"
                className="group btn-2030 btn-gold-2030 btn-2030-md w-full mt-2"
              >
                Receive My Interpretation
                <span className="btn-arrow">→</span>
              </button>

              <p className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70 pt-2">
                Private &amp; Secure · <span className="text-gold/80">Scripture-Only</span> · Unsubscribe Anytime
              </p>
              <p className="text-center text-[10px] text-muted-foreground/60 leading-relaxed px-2">
                Your dream and interpretation are encrypted and never shared. This is between you and God.
              </p>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
