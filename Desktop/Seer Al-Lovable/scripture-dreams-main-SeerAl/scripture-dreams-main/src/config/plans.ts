import { Scroll, BookOpen, Sword, Crown, Landmark, BookMarked } from "lucide-react";

export type PlanKey =
  | "trial"
  | "seeker_monthly"
  | "watchman_monthly"
  | "watchman_annual"
  | "prophets_circle"
  | "impartation";

export type PlanConfig = {
  key: PlanKey;
  name: string;
  priceDisplay: string;
  priceSuffix: string;
  cadence: string; // e.g. "one time", "per month", "per year"
  recurringText: string; // e.g. "Then $47/month — cancel anytime" or "Billed monthly"
  numericPrice: number;
  features: string[];
  tagline: string;
  description: string;
  microCopy?: string;
  ctaText: string;
  ctaSubtext: string;
  trustSignal?: string;
  socialProof?: string;
  authorityNote?: string;
  scarcity?: string;
  savings?: string[];
  badge?: string;
  featured?: boolean;
  premium?: boolean;
  icon: "scroll" | "bible" | "sword" | "crown" | "pillars" | "books";
  productGid: string; // Shopify GID
};

export const FIELD_GUIDE_CONFIG = {
  name: "The Watchman's Field Guide",
  priceDisplay: "$27",
  numericPrice: 27,
  productGid: "gid://shopify/Product/10030020657392",
};

// Standardize plan query parameter key to canonical PlanKey
export function normalizePlanKey(raw: string | null | undefined): PlanKey {
  if (!raw) return "trial";
  const cleaned = raw.toLowerCase().trim().replace("-", "_");
  if (cleaned === "trial") return "trial";
  if (cleaned === "seeker" || cleaned === "seeker_monthly") return "seeker_monthly";
  if (cleaned === "watchman" || cleaned === "watchman_monthly") return "watchman_monthly";
  if (cleaned === "annual" || cleaned === "watchman_annual") return "watchman_annual";
  if (cleaned === "prophets_circle" || cleaned === "prophets-circle" || cleaned === "prophets_circle_monthly") return "prophets_circle";
  if (cleaned === "impartation") return "impartation";
  return "trial";
}

export function isValidPlanKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const cleaned = key.toLowerCase().trim().replace("-", "_");
  return [
    "trial",
    "seeker",
    "seeker_monthly",
    "watchman",
    "watchman_monthly",
    "annual",
    "watchman_annual",
    "prophets_circle",
    "prophets-circle",
    "impartation"
  ].includes(cleaned);
}

export function getPlanIcon(iconName: string) {
  switch (iconName) {
    case "scroll": return Scroll;
    case "bible": return BookOpen;
    case "sword": return Sword;
    case "pillars": return Landmark;
    case "crown": return Crown;
    case "books": return BookMarked;
    default: return BookOpen;
  }
}

export const CANONICAL_PLANS: Record<PlanKey, PlanConfig> = {
  trial: {
    key: "trial",
    name: "Revelation Trial™",
    priceDisplay: "$7",
    priceSuffix: "today",
    cadence: "one time",
    recurringText: "Then $47/month — cancel anytime",
    numericPrice: 7,
    tagline: "Start Here",
    description: "Not ready to commit? Test the framework first. Three complete Scripture-first interpretations. Zero risk.",
    features: [
      "3 Scripture-First Dream Interpretations",
      "7-Day Full Access",
      "Instant Access — starts in minutes",
      "Biblical symbol breakdown per dream",
      "Prayer direction included",
      "Complete interpretation history saved",
    ],
    microCopy: "Most believers submit their first dream within 10 minutes.",
    ctaText: "Yes — Start For $7",
    ctaSubtext: "One-time · No subscription · 7-day guarantee",
    trustSignal: "3,241 believers started here",
    icon: "scroll",
    productGid: "gid://shopify/Product/10029440336112",
  },
  seeker_monthly: {
    key: "seeker_monthly",
    name: "Seeker™",
    priceDisplay: "$24.99",
    priceSuffix: "/month",
    cadence: "per month",
    recurringText: "Billed monthly — cancel anytime",
    numericPrice: 24.99,
    tagline: "For the Consistent Dreamer",
    description: "For believers who dream regularly and refuse to let God's voice go uninterpreted.",
    features: [
      "10 Dream Interpretations Monthly",
      "Biblical Symbol Pattern Tracking (identify recurring symbols over time)",
      "Scripture-First Prayer Direction",
      "Personal Dream Journal Archive",
      "Discernment Notes per Dream",
      "Cancel Anytime",
    ],
    microCopy: "Never wake up confused again.",
    ctaText: "Become a Seeker",
    ctaSubtext: "$24.99/month · Cancel anytime",
    trustSignal: "4,187 active Seekers this month",
    icon: "bible",
    productGid: "gid://shopify/Product/10029442695408",
  },
  watchman_monthly: {
    key: "watchman_monthly",
    name: "Watchman™",
    priceDisplay: "$47",
    priceSuffix: "/month",
    cadence: "per month",
    recurringText: "Billed monthly — cancel anytime",
    numericPrice: 47,
    tagline: "The Serious Discerner",
    description: "Unlimited access. No caps. No waiting. No limits. For the believer who takes every dream seriously.",
    features: [
      "Unlimited Dream Interpretations (no monthly cap, ever)",
      "Priority Processing (first in queue, every time)",
      "Full Biblical Symbol Reports",
      "Recurring Pattern Detection (God often speaks in series)",
      "Complete Dream Archive (lifetime reference)",
      "Deep Discernment Notes",
      "Cancel Anytime",
    ],
    microCopy: "Watchmen don't miss what God is saying. Neither will you.",
    ctaText: "Step Into Watchman",
    ctaSubtext: "$47/month · Unlimited · Cancel anytime",
    trustSignal: "Most popular for intercessors and prayer warriors",
    badge: "Most Chosen",
    featured: true,
    icon: "sword",
    productGid: "gid://shopify/Product/10029445349616",
  },
  watchman_annual: {
    key: "watchman_annual",
    name: "Watchman™ Annual",
    priceDisplay: "$397",
    priceSuffix: "/year",
    cadence: "per year",
    recurringText: "Billed annually — save $167",
    numericPrice: 397,
    tagline: "Best Long-Term Value",
    description: "For believers who know this isn't a one-time thing. Scripture-first discernment is a lifestyle. Lock in your rate and save two months.",
    features: [
      "Full Unlimited Dream Access (12 complete months)",
      "Everything in Watchman™",
      "Longest Priority Processing Window",
      "Complete Annual Dream Archive (track God's patterns all year)",
      "Year-End Discernment Report (your prophetic journey, compiled)",
      "Scripture Summary per Quarter",
      "Cancel Anytime",
    ],
    savings: ["Save $167 vs monthly", "= 2 months completely free"],
    microCopy: "The most committed believers build a lifetime of discernment. Not just one interpretation.",
    ctaText: "Lock In Annual Access",
    ctaSubtext: "$397/year · Save $167 · Best long-term value",
    trustSignal: "85% of annual members renew every year",
    icon: "pillars",
    productGid: "gid://shopify/Product/10029459702000",
  },
  prophets_circle: {
    key: "prophets_circle",
    name: "Prophet's Circle™",
    priceDisplay: "$97",
    priceSuffix: "/month",
    cadence: "per month",
    recurringText: "Billed monthly — cancel anytime",
    numericPrice: 97,
    tagline: "The Inner Circle",
    description: "Where serious believers walk together. Private. Vetted. Scripture-first. The community the prophetic world has needed for decades.",
    features: [
      "Everything in Watchman™ (Unlimited Interpretations)",
      "Private Vetted Community Access",
      "Weekly Group Interpretation Sessions",
      "Direct Access to Trained & Vetted Admins",
      "Intercessory Prayer Network (pray with serious believers)",
      "Monthly Live Discernment Sessions with Vetted Leaders",
      "Prophetic Pattern Recognition (group dream analysis)",
      "Accountability Partner Matching",
      "Cancel Anytime",
    ],
    socialProof: "847 believers already in the Circle",
    authorityNote: "Every community leader has completed our 4-week vetting intensive. No unchecked voices. No false doctrine. No New Age mixture.",
    scarcity: "Only 67 founding member spots remaining this month",
    badge: "Most Powerful",
    ctaText: "Join Prophet's Circle",
    ctaSubtext: "$97/month · Cancel anytime · Scripture-first community",
    premium: true,
    icon: "crown",
    productGid: "gid://shopify/Product/10029453050096",
  },
  impartation: {
    key: "impartation",
    name: "The Impartation",
    priceDisplay: "$97",
    priceSuffix: "/month",
    cadence: "per month",
    recurringText: "Founding cohort — price locked for life",
    numericPrice: 97,
    tagline: "Live Prophetic Group Mentorship — Founding Cohort",
    description: "Private cohort of 50 prophets, intercessors & dream carriers. Live prophetic group mentorship founding cohort.",
    features: [
      "Private cohort of 50 prophets, intercessors & dream carriers",
      "Live prophetic group mentorship",
      "Weekly live sessions",
      "Accountability partner matching",
      "Founding member price — locked for life",
    ],
    ctaText: "Enter The Impartation",
    ctaSubtext: "$97/month · Founding cohort",
    icon: "crown",
    productGid: "gid://shopify/Product/10030835269872",
  },
};
