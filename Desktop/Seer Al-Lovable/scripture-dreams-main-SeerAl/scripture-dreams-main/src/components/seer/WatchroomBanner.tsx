import { Link } from "@tanstack/react-router";

/**
 * Post-checkout banner — shows immediately after any purchase for
 * non-Prophet's Circle / non-Annual members. Drop into the order-confirmation
 * UI: <WatchroomBanner plan={purchasedPlan} />
 */
export function WatchroomBanner({ plan }: { plan?: string | null }) {
  const blocked = plan === "prophets_circle" || plan === "annual" || plan === "watchroom";
  if (blocked) return null;

  return (
    <div
      role="complementary"
      className="mx-auto mt-6 flex w-full max-w-3xl flex-col items-start gap-3 rounded-md border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex-1">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary">
          One more thing
        </p>
        <p className="mt-1 text-[15px] text-foreground font-display">
          You were not called to carry your gift alone.
          <span className="text-foreground/70"> Iron sharpens iron — see The Watchroom.</span>
        </p>
      </div>
      <Link
        to="/watchroom"
        className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-xs font-semibold tracking-wide text-primary-foreground transition hover:brightness-110"
      >
        Reserve My Seat →
      </Link>
    </div>
  );
}

export default WatchroomBanner;
