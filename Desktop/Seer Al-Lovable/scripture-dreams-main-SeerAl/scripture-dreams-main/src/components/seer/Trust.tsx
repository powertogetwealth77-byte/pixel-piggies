const IS = [
  "Scripture-anchored reflection",
  "A thoughtful symbolic companion",
  "A prayer-shaped journaling space",
  "Privacy-held and reverent",
];

const IS_NOT = [
  "Prophecy or divination",
  "A claim of certainty over your life",
  "Mystical or occult interpretation",
  "A replacement for pastoral counsel",
];

export function Trust() {
  return (
    <section id="trust" className="relative py-32 lg:py-44">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <p className="text-xs tracking-[0.3em] uppercase text-gold mb-6">Our Posture</p>
          <h2 className="font-display text-4xl lg:text-6xl text-ivory leading-tight">
            What Seer is — and what it is <span className="italic text-gradient-gold">not</span>.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
          <div className="rounded-3xl border border-gold/20 bg-card/40 backdrop-blur-sm p-10">
            <p className="text-xs uppercase tracking-[0.3em] text-gold mb-8">It Is</p>
            <ul className="space-y-5">
              {IS.map((item) => (
                <li key={item} className="flex items-start gap-4 text-ivory/90 text-lg">
                  <span className="mt-3 w-6 h-px bg-gold flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-border bg-card/20 backdrop-blur-sm p-10">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8">It Is Not</p>
            <ul className="space-y-5">
              {IS_NOT.map((item) => (
                <li key={item} className="flex items-start gap-4 text-muted-foreground text-lg">
                  <span className="mt-3 w-6 h-px bg-border flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground max-w-2xl mx-auto mt-16 leading-relaxed">
          "Test everything; hold fast what is good." <span className="text-gold/70">— 1 Thessalonians 5:21.</span> Seer is a tool for reflection, not revelation. Discernment belongs to you and the community of faith you trust.
        </p>
      </div>
    </section>
  );
}
