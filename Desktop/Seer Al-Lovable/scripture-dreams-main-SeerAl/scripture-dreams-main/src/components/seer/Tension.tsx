import { useReveal } from "@/hooks/useReveal";
import { useParallax } from "@/hooks/useParallax";
import tensionImage from "@/assets/tension-praying-man.jpg";

export function Tension() {
  const ref = useReveal<HTMLDivElement>();
  const parallax = useParallax<HTMLDivElement>(0.1);
  return (
    <section id="tension" className="relative py-32 lg:py-44 overflow-hidden section-veil-top">
      <div className="absolute inset-0 bg-gradient-cinematic opacity-60 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <div ref={ref} className="reveal-up grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Image left */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-elegant">
              <div ref={parallax} className="parallax-frame absolute inset-0">
                <img
                  src={tensionImage}
                  alt="A man sitting on the edge of his bed at dawn, hands clasped in quiet reflection"
                  width={1440}
                  height={1080}
                  loading="lazy"
                  className="w-full h-full object-cover parallax-scale"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-onyx via-onyx/20 to-transparent pointer-events-none z-[2]" />
            </div>
          </div>

          {/* Copy right */}
          <div className="lg:col-span-7">
            <p className="text-xs tracking-[0.3em] uppercase text-gold mb-6">The questions you wake up with</p>
            <h2 className="font-display text-4xl lg:text-6xl text-ivory leading-[1.05] mb-10">
              When a dream <span className="italic text-gradient-gold">won't let you go</span>,
              the silence after gets loud.
            </h2>

            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
              <p>
                <span className="text-ivory">Was that just stress — or was something being shown to me?</span>
                Most of us don't have a safe place to ask that out loud. We don't want
                to overreach. We don't want to underestimate it either.
              </p>
              <p>
                Recurring dreams. Warning dreams. Dreams of people you haven't thought
                of in years. The instinct to dismiss them rarely makes them quieter.
              </p>
              <p className="text-ivory/90">
                You don't need a mystic. You need Scripture, stillness, and a clear
                way to think it through.
              </p>
            </div>

            <div className="mt-12 flex items-center gap-5">
              <a
                href="#preview"
                className="group btn-2030 btn-ivory-2030 btn-2030-lg"
              >
                Decode My Dream Now
                <span className="btn-arrow">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
