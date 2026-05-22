// SEER AI — Product Registry
// Scripture-First · No New Age · No Occult Symbols

export type ProductType =
  | "subscription"
  | "digital_download"
  | "course"
  | "community";

export type NextStep = {
  step: string;
  title: string;
  body: string;
};

export type Product = {
  type: ProductType;
  tier?: string;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  image?: string;
  deliveryMethod?: "email" | "instant" | "shipped";
  accessInstructions: string[];
  ctaText: string;
  ctaUrl: string | null;
  nextSteps?: NextStep[];
  deliveryNote?: string;
  showPostPurchaseOffer: boolean;
  postPurchaseOfferId?: string;
};

const PRODUCT_REGISTRY: Record<string, Product> = {
  // ── SUBSCRIPTIONS ──────────────────────────
  "SEER-TRIAL-001": {
    type: "subscription",
    tier: "trial",
    name: "Revelation Trial™",
    tagline: "Your 7-day Scripture-first dream interpretation access",
    icon: "scroll",
    // Scroll = Habakkuk 2:2, Revelation 5:1
    // "Write the vision; make it plain on tablets"
    color: "#C9A84C",
    accessInstructions: [
      "Check your email for login credentials",
      "Submit your first dream within the next 24 hours",
      "Your 3 interpretations are ready to use",
    ],
    ctaText: "Submit My First Dream →",
    ctaUrl: "/dashboard",
    nextSteps: [
      {
        step: "1",
        title: "Check Your Email",
        body: "Your login link has been sent. Check spam if you don't see it.",
      },
      {
        step: "2",
        title: "Submit Your Dream",
        body: "Log in and submit the dream that brought you here. Don't wait — details fade fast.",
      },
      {
        step: "3",
        title: "Receive Your Interpretation",
        body: "Within minutes you'll have Scripture references, symbol breakdown, and prayer direction.",
      },
    ],
    showPostPurchaseOffer: true,
  },

  "SEER-SEEKER-002": {
    type: "subscription",
    tier: "seeker",
    name: "Seeker Plan™",
    tagline: "10 Scripture-first interpretations every month",
    icon: "bible",
    // Open Bible = Scripture-first foundation
    color: "#C9A84C",
    accessInstructions: [
      "Full account access is now active",
      "10 interpretations available immediately",
      "Your history is saved and searchable",
    ],
    ctaText: "Go to My Dashboard →",
    ctaUrl: "/dashboard",
    showPostPurchaseOffer: true,
  },

  "SEER-WATCHMAN-003": {
    type: "subscription",
    tier: "watchman",
    name: "Watchman Plan™",
    tagline: "Unlimited Scripture-first interpretations. No ceiling.",
    icon: "sword",
    // Sword = Ephesians 6:17
    // "The sword of the Spirit, which is the word of God"
    color: "#C9A84C",
    accessInstructions: [
      "Unlimited interpretations now active",
      "Submit as many dreams as God sends",
      "Full interpretation history saved",
    ],
    ctaText: "Begin Interpreting →",
    ctaUrl: "/dashboard",
    showPostPurchaseOffer: false,
    postPurchaseOfferId: "prophets-circle",
  },

  "SEER-PROPHETS-004": {
    type: "subscription",
    tier: "prophets_circle",
    name: "Prophet's Circle™",
    tagline: "Unlimited interpretations + vetted community access",
    icon: "crown",
    // Crown = Revelation 2:10
    // "Be faithful unto death, and I will give you the crown of life"
    color: "#C9A84C",
    accessInstructions: [
      "Unlimited interpretations active",
      "Community access pending approval (within 24 hours)",
      "Weekly live session invites will arrive by email",
    ],
    ctaText: "Enter the Circle →",
    ctaUrl: "/dashboard/prophets-circle",
    showPostPurchaseOffer: false,
  },

  "SEER-ANNUAL-005": {
    type: "subscription",
    tier: "annual",
    name: "Watchman Annual™",
    tagline: "12 months of unlimited interpretations. Locked in.",
    icon: "pillars",
    // Pillars = strength, covenant, "built on the foundation"
    // 1 Corinthians 3:11
    color: "#C9A84C",
    accessInstructions: [
      "Annual access now active — 365 days",
      "Unlimited interpretations, no ceiling",
      "Price locked. Cannot increase.",
    ],
    ctaText: "Begin My Year →",
    ctaUrl: "/dashboard",
    showPostPurchaseOffer: false,
  },

  // ── ONE-TIME PRODUCTS ───────────────────────
  "SEER-FIELD-GUIDE-001": {
    type: "digital_download",
    name: "The Watchman's Field Guide",
    tagline:
      "How to Capture, Decode & Pray Through Every Dream Before It Fades",
    icon: "books",
    // Books/study = 2 Timothy 2:15
    // "Study to show yourself approved"
    color: "#C9A84C",
    image: "/assets/watchmans-field-guide-oto.png",
    deliveryMethod: "email",
    accessInstructions: [
      "Your PDF has been sent to your email",
      "Check your inbox (and spam folder)",
      "Download and save to your device",
    ],
    ctaText: "Download Your Guide →",
    ctaUrl: null,
    deliveryNote:
      "Delivery time: within 5 minutes. Check spam if not received.",
    showPostPurchaseOffer: false,
  },

  // ── COMMUNITY / GROUP MENTORSHIP ────────────
  "SEER-WATCHROOM-006": {
    type: "community",
    tier: "watchroom",
    name: "The Watchroom",
    tagline: "Prophetic Group Mentorship",
    icon: "sword",
    color: "#C9A84C",
    accessInstructions: [
      "Welcome email with session schedule arriving shortly",
      "First live session: [next scheduled date]",
      "Community access granted within 24 hours",
    ],
    ctaText: "Enter The Watchroom →",
    ctaUrl: "/dashboard/watchroom",
    showPostPurchaseOffer: false,
  },

  "SEER-IMPARTATION-007": {
    type: "community",
    tier: "impartation",
    name: "The Impartation",
    tagline: "Live Prophetic Group Mentorship — Founding Cohort",
    icon: "crown",
    color: "#C9A84C",
    accessInstructions: [
      "Welcome email with Cohort 1 onboarding arriving shortly",
      "First live session date will be sent within 24 hours",
      "Accountability partner matched in the first week",
    ],
    ctaText: "Enter The Impartation →",
    ctaUrl: "/dashboard/impartation",
    showPostPurchaseOffer: false,
  },
};

export default PRODUCT_REGISTRY;
