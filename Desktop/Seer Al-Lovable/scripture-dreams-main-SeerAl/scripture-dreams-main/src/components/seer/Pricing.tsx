import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CANONICAL_PLANS, getPlanIcon, PlanConfig, PlanKey } from "@/config/plans";


// A/B Test variant toggle — flip to "B" to test leftmost premium positioning.
const VARIANT: "A" | "B" = "A";

const PLANS_KEYS = VARIANT === "A"
  ? (["trial", "seeker_monthly", "prophets_circle", "watchman_monthly", "watchman_annual"] as PlanKey[])
  : (["prophets_circle", "trial", "seeker_monthly", "watchman_monthly", "watchman_annual"] as PlanKey[]);

const PLANS: PlanConfig[] = PLANS_KEYS.map((key) => CANONICAL_PLANS[key]);

const COMPARISON_ROWS: Array<{
  label: string;
  values: [string, string, string, string, string];
}> = [
  { label: "Dream Interpretations", values: ["3", "10", "Unlimited", "Unlimited", "Unlimited"] },
  { label: "Scripture Maps", values: ["✦", "✦", "✦", "✦", "✦"] },
  { label: "Pattern Tracking", values: ["—", "✦", "✦", "✦", "✦"] },
  { label: "Dream Archive", values: ["—", "✦", "✦", "✦", "✦"] },
  { label: "Priority Access", values: ["—", "—", "✦", "✦", "✦"] },
  { label: "Community Access", values: ["—", "—", "—", "✦", "—"] },
  { label: "Vetted Admins", values: ["—", "—", "—", "✦", "—"] },
  { label: "Live Sessions", values: ["—", "—", "—", "✦", "—"] },
  { label: "Annual Savings", values: ["—", "—", "—", "—", "✦"] },
  { label: "Price", values: ["$7", "$24.99", "$47/mo", "$97/mo", "$397/yr"] },
];

const COMPARISON_COLS = ["Trial", "Seeker", "Watchman", "Prophet's", "Annual"];
const PROPHET_COL_INDEX = 3;

function trackTierEvent(action: string, plan: PlanConfig) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (typeof w.dataLayer?.push === "function") {
    w.dataLayer.push({ event: action, tier: plan.key, price: plan.priceDisplay });
  }
}

export function Pricing() {
  const [hoveredPremium, setHoveredPremium] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const navigate = useNavigate();

  return (
    <section id="pricing" className="relative py-32 lg:py-44">
      <div className="absolute inset-0 bg-gradient-cinematic opacity-50 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-xs tracking-[0.3em] uppercase text-gold mb-6">
            Choose Your Level of Discernment
          </p>
          <h2 className="font-display text-4xl lg:text-6xl text-ivory leading-tight mb-6">
            One Dream Can Change Everything.
            <br />
            <span className="text-gold/90">Make Sure You Understand It.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Every tier is Scripture-first.
            <br className="hidden sm:inline" /> No New Age mixture. No psychology.
            <br className="hidden sm:inline" /> Just the Word of God applied to what you saw.
          </p>
        </div>

        {/* Live ticker */}
        <div className="flex justify-center mb-14">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-gold/30 bg-[oklch(0.78_0.12_75_/_0.05)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
            </span>
            <span className="text-xs tracking-wide text-gold">
              2,847 believers received their interpretation this week
            </span>
          </div>
        </div>

        {/* Anchor pricing box */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="rounded-2xl border border-border bg-card/40 p-6 lg:p-8">
            <p className="text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-5 text-center">
              What believers typically spend
            </p>
            <div className="grid sm:grid-cols-2 gap-5 text-sm">
              <div className="flex justify-between sm:block">
                <span className="text-ivory/80">Prophetic Counselor</span>
                <span className="text-muted-foreground sm:block sm:mt-1">$150–$300 / session</span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-ivory/80">Christian Therapist</span>
                <span className="text-muted-foreground sm:block sm:mt-1">$100–$175 / session</span>
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-border/60 text-center">
              <p className="font-display text-2xl text-ivory">
                Seer AI: <span className="text-gold">from $7</span>
              </p>
              <p className="text-xs tracking-[0.2em] uppercase text-gold/80 mt-2">
                Scripture-First. Always.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-5 lg:gap-6 items-stretch">
          {PLANS.map((plan) => {
            const isPremium = !!plan.premium;
            const isFeatured = !!plan.featured;
            const PlanIcon = getPlanIcon(plan.icon);

            const baseClasses =
              "relative group rounded-3xl p-8 lg:p-9 flex flex-col transition-all duration-500";

            let visualClasses = "";
            let inlineStyle: React.CSSProperties = {};

            if (isPremium) {
              visualClasses =
                "border-[3px] border-gold bg-[oklch(1_0_0_/_0.05)] xl:scale-[1.08] hover:xl:scale-[1.11] z-10";
              inlineStyle = {
                boxShadow: hoveredPremium
                  ? "0 36px 100px oklch(0.78 0.12 75 / 0.48), 0 0 60px oklch(0.78 0.12 75 / 0.28), 0 0 0 1px oklch(0.78 0.12 75 / 0.45)"
                  : "0 30px 80px oklch(0.78 0.12 75 / 0.40), 0 0 40px oklch(0.78 0.12 75 / 0.20), 0 0 0 1px oklch(0.78 0.12 75 / 0.35)",
                transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
              };
            } else if (isFeatured) {
              visualClasses =
                "border-2 border-gold/80 bg-gradient-to-b from-card to-card/40 shadow-gold hover:scale-[1.03] z-[5]";
            } else {
              visualClasses =
                "border border-border bg-card/30 hover:border-gold/30 hover:scale-[1.02] z-[1]";
            }

            return (
              <div
                key={plan.name}
                data-tier={plan.key}
                data-price={plan.numericPrice.toString()}
                data-position={isPremium ? (VARIANT === "A" ? "center" : "leftmost") : "standard"}
                onMouseEnter={() => {
                  if (isPremium) setHoveredPremium(true);
                  trackTierEvent("tier_hover", plan);
                }}
                onMouseLeave={() => {
                  if (isPremium) setHoveredPremium(false);
                }}
                role="link"
                tabIndex={0}
                aria-label={`Choose ${plan.name} — ${plan.priceDisplay} ${plan.cadence}`}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("a,button")) return;
                  trackTierEvent("tier_card_click", plan);
                  localStorage.setItem("seer_selected_plan_v1", plan.key);
                  navigate({ to: "/checkout", search: { plan: plan.key as any } });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    const target = e.target as HTMLElement;
                    if (target.closest("a,button")) return;
                    e.preventDefault();
                    trackTierEvent("tier_card_click", plan);
                    localStorage.setItem("seer_selected_plan_v1", plan.key);
                    navigate({ to: "/checkout", search: { plan: plan.key as any } });
                  }
                }}
                className={`${baseClasses} ${visualClasses} cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60`}
                style={inlineStyle}
              >
                {plan.badge && (
                  <span
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gold text-onyx text-[11px] uppercase tracking-[0.28em] font-semibold whitespace-nowrap shadow-gold`}
                  >
                    {plan.badge}
                  </span>
                )}

                <div className={`mb-6 ${plan.badge ? "mt-4" : ""}`}>
                  <p className="text-[10px] tracking-[0.28em] uppercase text-gold mb-3">
                    {plan.tagline}
                  </p>
                  <h3 className="font-display text-2xl text-ivory flex items-center gap-2">
                    <PlanIcon className="w-5 h-5 text-gold/80 flex-shrink-0" />
                    <span>{plan.name}</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed min-h-[4.5rem]">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-5xl text-ivory">{plan.priceDisplay}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {plan.cadence}
                    </span>
                  </div>
                  {plan.savings && (
                    <div className="mt-3 space-y-0.5">
                      {plan.savings.map((line) => (
                        <p key={line} className="text-xs font-semibold text-gold tracking-wide">
                          {line}
                        </p>
                      ))}
                    </div>
                  )}
                  {plan.scarcity && (
                    <p className="text-[11px] text-gold mt-3 tracking-wide font-medium">
                      {plan.scarcity}
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-ivory/85">
                      <span className="text-gold flex-shrink-0 leading-5">✦</span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>

                {plan.microCopy && (
                  <p className="text-[11px] text-gold/90 mb-4 italic leading-relaxed">
                    {plan.microCopy}
                  </p>
                )}

                {plan.authorityNote && (
                  <p className="text-[11px] text-muted-foreground mb-4 italic leading-relaxed border-l-2 border-gold/40 pl-3">
                    {plan.authorityNote}
                  </p>
                )}

                {plan.socialProof && (
                  <p className="text-[11px] text-gold mb-4 text-center font-medium">
                    {plan.socialProof}
                  </p>
                )}

                <Link
                  to="/checkout"
                  search={{ plan: plan.key as any }}
                  data-action={`click-${plan.key}-cta`}
                  data-conversion-tier={
                    isPremium ? "premium" : isFeatured ? "featured" : "standard"
                  }
                  onClick={() => {
                    trackTierEvent("tier_cta_click", plan);
                    localStorage.setItem("seer_selected_plan_v1", plan.key);
                  }}
                  className={`btn-2030 btn-2030-md w-full ${
                    isPremium || isFeatured ? "btn-gold-2030" : "btn-ghost-2030"
                  }`}
                >
                  {plan.ctaText}
                  <span className="btn-arrow">→</span>
                </Link>
                <p className="text-[10px] text-muted-foreground text-center mt-3 tracking-wide">
                  {plan.ctaSubtext}
                </p>
                {plan.trustSignal && (
                  <p className="text-[10px] text-muted-foreground/70 text-center mt-2 italic">
                    {plan.trustSignal}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Trust wall */}
        <div className="mt-16 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
          <span className="flex items-center gap-2"><span className="text-gold">✦</span> Encrypted</span>
          <span className="flex items-center gap-2"><span className="text-gold">✦</span> Scripture-Only</span>
          <span className="flex items-center gap-2"><span className="text-gold">✦</span> 7-Day Guarantee</span>
          <span className="flex items-center gap-2"><span className="text-gold">✦</span> No New Age Mixture</span>
          <span className="flex items-center gap-2"><span className="text-gold">✦</span> Cancel Anytime</span>
        </div>

        {/* Comparison table */}
        <div className="mt-20 max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-xs tracking-[0.3em] uppercase text-gold mb-3">Side by Side</p>
            <button
              type="button"
              onClick={() => setShowCompare((v) => !v)}
              className="md:hidden text-sm text-ivory/80 underline underline-offset-4 decoration-gold/50"
            >
              {showCompare ? "Hide comparison" : "Compare all plans"}
            </button>
          </div>

          <div className={`${showCompare ? "block" : "hidden"} md:block overflow-x-auto`}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-3 text-[11px] tracking-[0.22em] uppercase text-muted-foreground font-normal">
                    Feature
                  </th>
                  {COMPARISON_COLS.map((col, i) => (
                    <th
                      key={col}
                      className={`text-center py-4 px-3 text-[11px] tracking-[0.22em] uppercase font-medium ${
                        i === PROPHET_COL_INDEX
                          ? "text-gold bg-[oklch(0.78_0.12_75_/_0.08)]"
                          : "text-ivory/80"
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-border/40">
                    <td className="py-3.5 px-3 text-ivory/80">{row.label}</td>
                    {row.values.map((val, i) => {
                      const isProphet = i === PROPHET_COL_INDEX;
                      const isCheck = val === "✦";
                      const isX = val === "—";
                      return (
                        <td
                          key={i}
                          className={`py-3.5 px-3 text-center ${
                            isProphet ? "bg-[oklch(0.78_0.12_75_/_0.08)]" : ""
                          } ${
                            isCheck
                              ? "text-gold"
                              : isX
                                ? "text-destructive/70"
                                : "text-ivory"
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground/60 mt-16">
          Secure checkout · Cancel anytime · No hidden tiers
        </p>
      </div>
    </section>
  );
}
