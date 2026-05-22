import heroImage from "@/assets/hero-awake-317.jpg";
import { useParallax } from "@/hooks/useParallax";

export function Hero() {
  const parallaxRef = useParallax<HTMLDivElement>(0.08);
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden grain pt-28 lg:pt-0">
      {/* Ambient backdrop */}
      <div className="absolute inset-0 bg-gradient-cinematic pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-gold/[0.06] blur-3xl glow-pulse pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-veil pointer-events-none" />

      <div className="relative w-full max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-24">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* LEFT: emotional copy */}
          <div className="lg:col-span-6 relative z-10">
            <div className="reveal inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-border bg-card/40 backdrop-blur-sm mb-8">
              <div className="w-1 h-1 rounded-full bg-gold" />
              <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
                Scripture-First Dream Reflection
              </span>
            </div>

            <h1 className="reveal reveal-delay-1 font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-ivory leading-[0.95] tracking-tight mb-7">
              Some dreams
              <br />
              should not be
              <br />
              <span className="text-gradient-gold italic">ignored.</span>
            </h1>

            <p className="reveal reveal-delay-2 max-w-xl text-lg text-muted-foreground leading-relaxed mb-10">
              Scripture-first dream decoding designed to help you reflect,
              discern patterns, and approach meaningful dreams with wisdom —
              without mysticism, hype, or false prophecy.
            </p>

            <div className="reveal reveal-delay-3 flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-12">
              <a
                href="/checkout?plan=trial"
                className="group btn-2030 btn-gold-2030 btn-2030-lg"
              >
                Start My $7 Revelation Trial
                <span className="btn-arrow">→</span>
              </a>
              <a
                href="#how"
                className="btn-2030 btn-ghost-2030 btn-2030-md"
              >
                See How It Works
              </a>
            </div>

            <div className="reveal reveal-delay-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70">
              <span>Secure Checkout</span>
              <span className="hidden sm:inline w-px h-3 bg-border" />
              <span>Scripture-First</span>
              <span className="hidden sm:inline w-px h-3 bg-border" />
              <span>No Mystical Claims</span>
            </div>
          </div>

          {/* RIGHT: cinematic image */}
          <div className="lg:col-span-6 relative">
            <div className="reveal reveal-delay-2 relative aspect-[4/5] lg:aspect-[5/6] rounded-3xl overflow-hidden shadow-elegant">
              <div ref={parallaxRef} className="parallax-frame absolute inset-0">
                <img
                  src={heroImage}
                  alt="A woman awake in bed at 3:17 AM after a dream, faint lamp light, contemplative"
                  width={1280}
                  height={1600}
                  className="w-full h-full object-cover parallax-scale"
                  fetchPriority="high"
                />
              </div>
              {/* Cinematic veils */}
              <div className="absolute inset-0 bg-gradient-to-t from-onyx via-onyx/10 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-onyx/40 via-transparent to-transparent pointer-events-none" />

              {/* Faint scripture watermark inside frame */}
              <div className="absolute bottom-6 left-7 right-7 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gold/80 mb-2">Selah · Psalm 4:4</p>
                  <p className="font-display text-ivory/90 text-lg leading-snug max-w-xs italic">
                    "Ponder in your own hearts on your beds, and be silent."
                  </p>
                </div>
              </div>
            </div>

            {/* Floating hairline accent */}
            <div className="absolute -bottom-3 left-10 right-10 hairline opacity-50" />
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 text-muted-foreground/50">
        <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-gold/40 to-transparent" />
      </div>
    </section>
  );
}
