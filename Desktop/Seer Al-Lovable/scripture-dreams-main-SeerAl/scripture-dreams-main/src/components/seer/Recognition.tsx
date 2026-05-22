import { useReveal } from "@/hooks/useReveal";
import recog1 from "@/assets/recog-1.jpg";
import recog2 from "@/assets/recog-2.jpg";
import recog3 from "@/assets/recog-3.jpg";

const LINES = [
  "The same dream, again — and you wake up unsettled.",
  "Symbols you can't explain that won't leave you alone.",
  "A passage that feels like it was written for last night.",
  "Quiet questions you don't quite know how to ask out loud.",
];

const SCENES = [
  { src: recog1, alt: "Woman journaling on her bed after a dream", caption: "She journals it before it fades." },
  { src: recog2, alt: "Man at his kitchen counter at sunrise, looking down in thought", caption: "He sits with it before the day starts." },
  { src: recog3, alt: "Woman in her parked car recording a voice note at dawn", caption: "She records the parts she's afraid to forget." },
];

export function Recognition() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section id="recognition" className="relative py-32 lg:py-44 overflow-hidden">
      <div className="absolute top-0 inset-x-0 hairline" />
      <div className="absolute -top-32 right-0 w-[600px] h-[600px] rounded-full bg-gold/[0.04] blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div ref={ref} className="reveal-up max-w-5xl">
          <p className="text-xs tracking-[0.3em] uppercase text-gold mb-8">If you're here, something stayed with you.</p>
          <h2 className="font-display text-4xl lg:text-6xl text-ivory leading-[1.05] max-w-3xl mb-16">
            You're not the only one
            <span className="italic text-gradient-gold"> still thinking </span>
            about that dream.
          </h2>

          <ul className="reveal-stagger space-y-6 max-w-3xl mb-24">
            {LINES.map((l) => (
              <li key={l} className="flex items-start gap-5 text-ivory/90 text-xl lg:text-2xl font-display leading-snug">
                <span className="mt-4 w-8 h-px bg-gold/60 flex-shrink-0" />
                {l}
              </li>
            ))}
          </ul>
        </div>

        {/* Asymmetric staggered UGC scenes */}
        <div className="relative grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
          <figure className="col-span-7 sm:col-span-5 sm:col-start-1 lg:col-start-1 lg:col-span-4 lg:mt-12">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-elegant">
              <img src={SCENES[0].src} alt={SCENES[0].alt} loading="lazy" width={1024} height={1280} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-onyx/70 via-onyx/10 to-transparent pointer-events-none" />
            </div>
            <figcaption className="mt-4 text-xs tracking-[0.2em] uppercase text-muted-foreground/80">{SCENES[0].caption}</figcaption>
          </figure>

          <figure className="col-span-5 sm:col-span-6 sm:col-start-7 lg:col-start-6 lg:col-span-4">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-elegant">
              <img src={SCENES[1].src} alt={SCENES[1].alt} loading="lazy" width={1024} height={1280} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-onyx/70 via-onyx/10 to-transparent pointer-events-none" />
            </div>
            <figcaption className="mt-4 text-xs tracking-[0.2em] uppercase text-muted-foreground/80">{SCENES[1].caption}</figcaption>
          </figure>

          <figure className="col-span-12 sm:col-span-7 sm:col-start-4 lg:col-start-10 lg:col-span-3 lg:mt-24">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-elegant">
              <img src={SCENES[2].src} alt={SCENES[2].alt} loading="lazy" width={1024} height={1280} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-onyx/70 via-onyx/10 to-transparent pointer-events-none" />
            </div>
            <figcaption className="mt-4 text-xs tracking-[0.2em] uppercase text-muted-foreground/80">{SCENES[2].caption}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
