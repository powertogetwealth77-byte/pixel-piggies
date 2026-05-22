import { useReveal } from "@/hooks/useReveal";
import imani from "@/assets/ugc-imani.jpg";
import daniel from "@/assets/ugc-daniel.jpg";
import marisol from "@/assets/ugc-marisol.jpg";
import marcus from "@/assets/ugc-marcus.jpg";
import sarah from "@/assets/ugc-sarah.jpg";
import thomas from "@/assets/ugc-thomas.jpg";

type Item = {
  quote: string;
  name: string;
  role: string;
  image: string;
  tier: string;
  badge: string;
  isVideo?: boolean;
  videoMeta?: { duration: string; title: string };
};

const ITEMS: Item[] = [
  {
    quote:
      "I had the same dream for 11 weeks straight. A door I couldn't open. Water behind it. I searched everywhere — got astrology, chakra nonsense, vague symbolism. I found SEER at 2 AM on a Tuesday. I submitted the dream. Within minutes I had Ezekiel 47, John 7:38, and a prayer direction I could actually bring to my pastor. I'm not confused anymore. I know how to pray what I see.",
    name: "Imani R.",
    role: "Worship Leader · Atlanta, GA",
    image: imani,
    tier: "Watchman Member · 8 months",
    badge: "Verified Member",
  },
  {
    quote:
      "I was skeptical. I'm a pastor. I don't touch anything that isn't grounded in Scripture. Period. What changed my mind was simple: SEER quoted more Scripture in one interpretation than most dream books quote in their entire index. And it never told me what God was saying. It gave me the framework to seek Him myself. That's the difference. That's why I use it weekly.",
    name: "Daniel K.",
    role: "Church Planter · Austin, TX",
    image: daniel,
    tier: "Prophet's Circle Member · 5 months",
    badge: "Verified Member",
  },
  {
    quote:
      "Three of my clients came to me with dreams they'd been carrying for months. Anxious. Confused. No framework to process them. I started using SEER to build a biblical foundation before our sessions. The difference is measurable. My clients have language for what they're experiencing spiritually. They come to sessions with Scripture. They come ready to pray — not just talk. I recommend it to every believing client I work with.",
    name: "Marisol S.",
    role: "Christian Therapist · Phoenix, AZ",
    image: marisol,
    tier: "Watchman Member · 11 months",
    badge: "Verified Member",
  },
  {
    quote: "",
    name: "Pastor Marcus D.",
    role: "Senior Pastor · Birmingham, AL",
    image: marcus,
    tier: "Prophet's Circle Member · 7 months",
    badge: "Verified Leader · Vetted",
    isVideo: true,
    videoMeta: {
      duration: "2:47",
      title: "Why I recommend SEER to my congregation",
    },
  },
  {
    quote:
      "I intercede for my city. I dream almost every night. For years I've had no system — just journaling and asking God. SEER didn't replace that. It sharpened it. Now I submit every significant dream. I receive the Scripture framework. I take it to prayer. Last month a dream I almost ignored led to a 3-day fast for my city. Something broke in the spirit. I felt it. Don't sleep on what God is showing you.",
    name: "Sarah K.",
    role: "Intercessor · Nashville, TN",
    image: sarah,
    tier: "Watchman Annual Member",
    badge: "Verified Member",
  },
  {
    quote:
      "I've been in ministry 22 years. I've seen every kind of 'prophetic tool' come and go. Most of them are dangerous. Unaccountable. New Age mixture. False certainty dressed up in Christian language. SEER is different in one way that matters above all else: It never claims to speak for God. It always points you back to Scripture, prayer, and your pastor. That humility is what makes it safe. That's what makes it trustworthy. That's why I use it.",
    name: "Thomas R.",
    role: "Ministry Leader · 22 Years · Dallas, TX",
    image: thomas,
    tier: "Prophet's Circle Member · 4 months",
    badge: "Verified Leader · Vetted",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5 text-gold text-sm tracking-wide" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>★</span>
      ))}
    </div>
  );
}

export function Testimonials() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section id="testimonials" className="relative py-32 lg:py-44">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <p className="text-xs tracking-[0.3em] uppercase text-gold mb-6">
            What Believers Are Saying
          </p>
          <h2 className="font-display text-4xl lg:text-6xl text-ivory leading-tight mb-6">
            Real Dreams. Real Scripture.{" "}
            <span className="italic text-gradient-gold">Real Clarity.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            These are not edited success stories. These are believers who submitted a dream,
            received a Scripture-first interpretation, and prayed through what God revealed.
          </p>
        </div>

        {/* Social proof bar */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="rounded-2xl border border-gold/30 bg-[oklch(0.78_0.12_75_/_0.05)] p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Stars />
              <span className="text-ivory font-semibold">4.9/5</span>
              <span className="text-muted-foreground text-sm">
                · 3,241 interpretations delivered
              </span>
            </div>
            <p className="text-[11px] tracking-[0.25em] uppercase text-gold/90 mb-4">
              Scripture-first. No New Age. No exceptions.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-[10px] tracking-[0.18em] uppercase">
              {["98% Scripture-Only", "Zero New Age", "7-Day Guarantee", "Cancel Anytime"].map(
                (t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded border border-gold/30 text-gold/90"
                  >
                    {t}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Cards grid */}
        <div ref={ref} className="reveal-stagger grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
          {ITEMS.map((t, i) => (
            <figure
              key={i}
              className="group rounded-2xl border border-gold/20 bg-[oklch(1_0_0_/_0.03)] p-6 lg:p-8 flex flex-col transition-all duration-300 hover:border-gold/60 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
            >
              <div
                className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-6"
                style={{ filter: "contrast(1.05) brightness(0.95)" }}
              >
                <img
                  src={t.image}
                  alt={`Portrait of ${t.name}`}
                  width={800}
                  height={640}
                  loading="lazy"
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                />
                {t.isVideo && (
                  <>
                    <div className="absolute inset-0 bg-onyx/40" />
                    <button
                      type="button"
                      className="absolute inset-0 flex items-center justify-center"
                      aria-label="Play video testimonial"
                    >
                      <span className="flex items-center justify-center w-16 h-16 rounded-full bg-gold shadow-gold transition-transform group-hover:scale-110">
                        <span className="ml-1 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[16px] border-l-onyx" />
                      </span>
                    </button>
                    <span className="absolute bottom-2 right-3 text-[11px] text-ivory bg-onyx/70 px-2 py-0.5 rounded">
                      {t.videoMeta?.duration}
                    </span>
                  </>
                )}
              </div>

              <Stars />

              {t.isVideo ? (
                <div className="mt-4 mb-6 flex-1">
                  <p className="font-display text-xl text-ivory leading-snug mb-2">
                    {t.videoMeta?.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Watch Pastor Marcus share why he recommends SEER from the pulpit.
                  </p>
                </div>
              ) : (
                <>
                  <div className="font-display text-3xl text-gold/60 leading-none mt-3 mb-1">
                    "
                  </div>
                  <blockquote className="text-[15px] italic text-ivory/85 leading-[1.7] mb-5 flex-1">
                    {t.quote}
                  </blockquote>
                </>
              )}

              <figcaption className="border-t border-border/60 pt-4">
                <div className="text-sm font-bold text-ivory">{t.name}</div>
                <div className="text-xs text-muted-foreground/80 mt-1">{t.role}</div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-[10px] uppercase tracking-wider text-gold border border-gold/40 rounded px-2 py-0.5">
                    {t.tier}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    ✓ {t.badge}
                  </span>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 max-w-2xl mx-auto text-center">
          <p className="font-display text-2xl lg:text-3xl text-ivory leading-snug mb-6">
            Join <span className="text-gold">3,241 believers</span> who've brought their dreams
            under Scripture.
          </p>
          <a
            href="/checkout?plan=trial"
            className="btn-2030 btn-2030-lg btn-gold-2030 w-full sm:w-auto"
          >
            Start My $7 Revelation Trial
            <span className="btn-arrow">→</span>
          </a>
          <p className="text-xs text-muted-foreground mt-4 tracking-wide">
            7-day money-back guarantee · Scripture-first · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
