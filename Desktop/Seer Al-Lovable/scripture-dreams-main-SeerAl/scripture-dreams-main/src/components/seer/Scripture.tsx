import { useReveal } from "@/hooks/useReveal";

export function Scripture() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section id="scripture" className="relative py-32 lg:py-44 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-cinematic opacity-70 pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gold/[0.05] blur-3xl pointer-events-none" />

      <div ref={ref} className="reveal-up relative max-w-4xl mx-auto px-6 lg:px-10 text-center">
        <p className="text-xs tracking-[0.3em] uppercase text-gold mb-10">Job 33:14–18 · ESV</p>

        <blockquote className="font-display text-2xl sm:text-3xl lg:text-5xl text-ivory leading-[1.2] tracking-tight">
          <p className="mb-6">
            "For God speaks in <span className="italic text-gradient-gold">one way</span>,
            and in two, though man does not perceive it.
          </p>
          <p className="mb-6">
            In a <span className="italic text-gradient-gold">dream</span>, in a vision of the night,
            when deep sleep falls on men, while they slumber on their beds,
          </p>
          <p>
            then he opens the ears of men and{" "}
            <span className="italic text-gradient-gold">seals their instruction</span>,
            that he may turn man aside from his deed and conceal pride from a man;
            he keeps back his soul from the pit,
            his life from perishing by the <span className="italic text-gradient-gold">sword</span>."
          </p>
        </blockquote>

        <div className="mt-16 max-w-2xl mx-auto space-y-6 text-lg text-muted-foreground leading-relaxed">
          <p className="text-ivory/90">
            Scripture is clear: God still speaks in dreams — and the warnings He
            seals there are meant to <span className="text-ivory">keep your soul from the sword</span>.
          </p>
          <p>
            The danger isn't dreaming. The danger is dismissing what was sealed for
            you while you slept. If you can't decode it, you can't be turned by it.
          </p>
        </div>

        <div className="mt-12 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground/70">
          <span>Sealed Instruction</span>
          <span className="w-px h-3 bg-border" />
          <span>A Soul Kept</span>
          <span className="w-px h-3 bg-border" />
          <span>A Life Spared</span>
        </div>

        <div className="mt-14">
          <a
            href="#preview"
            className="group btn-2030 btn-gold-2030 btn-2030-lg"
          >
            Reveal What Was Sealed For You
            <span className="btn-arrow">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
