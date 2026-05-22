import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Lock,
  BookOpen,
  RotateCcw,
  Zap,
  XCircle,
  Check,
  Star,
  Shield,
  Cross,
  Plus,
  Minus,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import otoFieldGuide from "@/assets/oto-watchmans-field-guide.png";

import { CANONICAL_PLANS, normalizePlanKey, isValidPlanKey, getPlanIcon, PlanKey } from "@/config/plans";

const BUMP_PRICE = 27;

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>): { plan?: string } => {
    return {
      plan: typeof search.plan === "string" ? search.plan : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Secure Checkout — Seer AI" },
      {
        name: "description",
        content:
          "Complete your order and begin receiving Scripture-first interpretation of every dream God sends you. Secure Shopify checkout.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { plan: searchPlan } = Route.useSearch();
  
  const [planKey, setPlanKey] = useState<PlanKey>(() => {
    if (searchPlan && isValidPlanKey(searchPlan)) {
      return normalizePlanKey(searchPlan);
    }
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("seer_selected_plan_v1");
      if (saved && isValidPlanKey(saved)) {
        return normalizePlanKey(saved);
      }
    }
    return "trial";
  });

  useEffect(() => {
    if (searchPlan && isValidPlanKey(searchPlan)) {
      const normalized = normalizePlanKey(searchPlan);
      setPlanKey(normalized);
      localStorage.setItem("seer_selected_plan_v1", normalized);
    } else {
      const saved = localStorage.getItem("seer_selected_plan_v1");
      if (saved && isValidPlanKey(saved)) {
        setPlanKey(normalizePlanKey(saved));
      } else {
        setPlanKey("trial");
      }
    }
  }, [searchPlan]);

  const selectedPlan = CANONICAL_PLANS[planKey];
  const PlanIcon = getPlanIcon(selectedPlan.icon);

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bump, setBump] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("seer_lead_v1");
      if (!raw) return;
      const lead = JSON.parse(raw) as { name?: string; firstName?: string; email?: string; phone?: string };
      if (lead?.firstName) setFirstName(lead.firstName);
      else if (lead?.name) setFirstName(lead.name.split(" ")[0]);
      if (lead?.email) setEmail(lead.email);
      if (lead?.phone) setPhone(lead.phone);
    } catch {
      /* ignore */
    }
  }, []);

  const totalToday = (selectedPlan.numericPrice + (bump ? BUMP_PRICE : 0)).toFixed(2);

  const [totalFlip, setTotalFlip] = useState(false);
  useEffect(() => {
    setTotalFlip(true);
    const t = setTimeout(() => setTotalFlip(false), 180);
    return () => clearTimeout(t);
  }, [bump]);

  const [showReminder, setShowReminder] = useState(false);
  const ctaRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = ctaRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setShowReminder(true), 1500);
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    const name = firstName.trim();
    const mail = email.trim();
    if (name.length < 2) {
      setFormError("Please enter your first name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    setFormError(null);
    setSubmitting(true);

    if (!selectedPlan.key) {
      setSubmitting(false);
      setFormError("Checkout is not configured yet for this plan.");
      return;
    }

    try {
      localStorage.setItem(
        "seer_lead_v1",
        JSON.stringify({ firstName: name, email: mail, phone: phone.trim() }),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (typeof w.dataLayer?.push === "function") {
        w.dataLayer.push({
          event: "begin_checkout",
          tier: selectedPlan.key,
          email: mail,
          bump_field_guide: bump,
        });
      }
    } catch {
      /* ignore */
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedPlan.key,
          firstName: name,
          email: mail,
          phone: phone.trim(),
          bumpFieldGuide: bump,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "We couldn't reach Shopify just now. Please try again.");
      }
      if (!data.url) throw new Error("We couldn't reach Shopify just now. Please try again.");
      window.location.href = data.url;
    } catch (err) {
      setSubmitting(false);
      setFormError(
        err instanceof Error ? err.message : "We couldn't reach Shopify just now. Please try again.",
      );
    }
  }

  const ctaLabel = submitting
    ? "Processing Your Order…"
    : bump
      ? "Complete My Order + Field Guide →"
      : "Complete My Order — Begin My Journey →";

  return (
    <main className="relative min-h-screen bg-[#0A0E1A] text-[#F8F5EC]">
      <style>{`
        :root {
          --co-gold: #C9A84C;
          --co-gold-light: #C9A84C;
          --co-gold-dark: #C49040;
          --co-gold-glow: rgba(201, 168, 76,0.15);
          --co-gold-border: rgba(201, 168, 76,0.25);
          --co-gold-border-hover: rgba(201, 168, 76,0.55);
          --co-ink: #0A0E1A;
          --co-cream: #F8F5EC;
          --co-muted: rgba(255,255,255,0.45);
          --co-border-soft: rgba(255,255,255,0.06);
          --co-radius-sm: 10px;
          --co-radius-md: 14px;
          --co-radius-lg: 20px;
          --co-radius-pill: 50px;
          --co-shadow-gold: 0 8px 32px rgba(201, 168, 76,0.2);
          --co-shadow-gold-lg: 0 16px 56px rgba(201, 168, 76,0.4);
          --co-trans: all 0.22s cubic-bezier(0.4,0,0.2,1);
        }

        /* ============ FORM FIELDS ============ */
        .co-input {
          width: 100%;
          height: 54px;
          padding: 0 18px;
          font-size: 16px;
          color: #fff;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: var(--co-radius-sm);
          outline: none;
          transition: var(--co-trans);
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.03);
        }
        .co-input::placeholder { color: rgba(255,255,255,0.35); }
        .co-input:hover { border-color: rgba(255,255,255,0.15); }
        .co-input:focus {
          border-color: var(--co-gold);
          background: rgba(255,255,255,0.05);
          box-shadow:
            inset 0 1px 3px rgba(0,0,0,0.2),
            0 0 0 3px rgba(201, 168, 76,0.12),
            0 0 20px rgba(201, 168, 76,0.08);
        }
        .co-input:not(:placeholder-shown):not(:focus) {
          border-color: rgba(201, 168, 76,0.35);
        }
        .co-field-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(201, 168, 76,0.9);
          margin-bottom: 8px;
          transition: color 0.2s ease, transform 0.2s ease;
        }
        .co-field:focus-within .co-field-label {
          color: var(--co-gold);
          transform: translateY(-1px);
        }

        /* ============ PAYMENT DIVIDER ============ */
        .co-pay-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 28px 0 18px;
        }
        .co-pay-divider::before, .co-pay-divider::after {
          content: ''; flex: 1; height: 1px;
          background: linear-gradient(to right, transparent, rgba(201, 168, 76,0.3), transparent);
        }
        .co-pay-divider-label {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 9px; font-weight: 700; letter-spacing: 0.22em;
          color: var(--co-gold); text-transform: uppercase; white-space: nowrap;
        }
        .co-diamond { font-size: 6px; opacity: 0.6; }

        /* ============ PAYMENT ICONS ============ */
        .co-pay-icons {
          display: flex; align-items: center; gap: 8px;
          flex-wrap: wrap; justify-content: center; margin: 12px 0 4px;
        }
        .co-pay-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 52px; height: 34px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          transition: var(--co-trans);
          overflow: hidden;
        }
        .co-pay-icon:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(201, 168, 76,0.3);
          transform: translateY(-1px);
        }

        /* ============ OTO CARD ============ */
        .co-oto-wrap { position: relative; margin-top: 36px; padding-top: 16px; }
        .co-oto-badge {
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          z-index: 2;
          background: linear-gradient(135deg, #C9A84C, #C49040);
          color: #0A0E1A;
          font-size: 9px; font-weight: 800; letter-spacing: 0.18em;
          text-transform: uppercase;
          padding: 6px 20px; border-radius: 20px; white-space: nowrap;
          box-shadow: 0 4px 16px rgba(201, 168, 76,0.4);
        }
        .co-oto-card {
          background: linear-gradient(145deg, rgba(201, 168, 76,0.06) 0%, rgba(201, 168, 76,0.02) 50%, rgba(201, 168, 76,0.04) 100%);
          border: 1.5px solid rgba(201, 168, 76,0.35);
          border-radius: var(--co-radius-lg);
          padding: 32px 28px 28px;
          box-shadow:
            0 0 0 1px rgba(201, 168, 76,0.08),
            0 8px 32px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(201, 168, 76,0.12);
          transition: var(--co-trans);
        }
        .co-oto-card.is-selected {
          border-color: rgba(201, 168, 76,0.7);
          background: linear-gradient(145deg, rgba(201, 168, 76,0.10) 0%, rgba(201, 168, 76,0.04) 100%);
          box-shadow:
            0 0 0 1px rgba(201, 168, 76,0.2),
            0 12px 48px rgba(201, 168, 76,0.15),
            inset 0 1px 0 rgba(201, 168, 76,0.2);
        }
        .co-check {
          width: 24px; height: 24px; min-width: 24px;
          border: 2px solid rgba(201, 168, 76,0.5);
          border-radius: 6px;
          background: rgba(255,255,255,0.03);
          position: relative; flex-shrink: 0;
          transition: var(--co-trans); cursor: pointer;
          display: inline-block;
        }
        .co-check:hover {
          border-color: var(--co-gold);
          background: rgba(201, 168, 76,0.08);
          transform: scale(1.05);
        }
        .co-check.is-on {
          background: var(--co-gold);
          border-color: var(--co-gold);
          animation: coCheckPop 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .co-check.is-on::after {
          content: '';
          position: absolute; top: 3px; left: 7px;
          width: 6px; height: 11px;
          border: 2.5px solid #0A0E1A;
          border-top: none; border-left: none;
          transform: rotate(45deg);
          animation: coCheckDraw 0.2s ease 0.05s both;
        }
        @keyframes coCheckPop {
          0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); }
        }
        @keyframes coCheckDraw {
          from { transform: rotate(45deg) scale(0); opacity: 0; }
          to { transform: rotate(45deg) scale(1); opacity: 1; }
        }

        .co-oto-product-icon {
          width: 48px; height: 48px;
          background: rgba(201, 168, 76,0.1);
          border: 1px solid rgba(201, 168, 76,0.25);
          border-radius: 12px;
          display: inline-flex; align-items: center; justify-content: center;
          color: var(--co-gold);
        }
        .co-oto-original {
          font-size: 16px; color: var(--co-muted);
          text-decoration: line-through;
          text-decoration-color: rgba(232,120,120,0.6);
        }
        .co-oto-sale {
          font-size: 28px; font-weight: 800; color: var(--co-gold); line-height: 1;
        }
        .co-save-badge {
          background: rgba(110,210,130,0.15);
          color: #6ED282;
          border: 1px solid rgba(110,210,130,0.25);
          border-radius: 20px;
          padding: 3px 10px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
        }
        .co-feature-dot {
          width: 18px; height: 18px; border-radius: 50%;
          background: rgba(201, 168, 76,0.12);
          border: 1px solid rgba(201, 168, 76,0.3);
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: var(--co-gold); font-size: 8px;
        }

        /* ============ OTO IMAGE ============ */
        .co-oto-card { padding: 0 !important; overflow: hidden; }
        .co-oto-image-wrap {
          position: relative; width: 100%; overflow: hidden;
          border-radius: 20px 20px 0 0;
        }
        .co-oto-image {
          width: 100%; max-height: 380px; height: auto;
          object-fit: cover; object-position: top center; display: block;
          animation: coImageFadeIn 0.6s ease 0.15s both;
          transition: transform 0.5s ease;
        }
        @keyframes coImageFadeIn {
          from { opacity: 0; transform: scale(1.02); }
          to { opacity: 1; transform: scale(1); }
        }
        .co-oto-image-wrap::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0;
          height: 90px;
          background: linear-gradient(to bottom, transparent, rgba(10,14,26,0.97));
          pointer-events: none;
        }
        .co-oto-card:hover .co-oto-image { transform: scale(1.015); }
        .co-oto-card.is-selected .co-oto-image-wrap {
          box-shadow: inset 0 0 0 2px rgba(201, 168, 76,0.6);
        }
        .co-oto-card.is-selected .co-oto-image { transform: scale(1.01); }
        .co-oto-body { padding: 24px 28px 28px; }
        @media (max-width: 768px) {
          .co-oto-image { max-height: 280px; }
          .co-oto-body { padding: 20px 18px 22px; }
        }
        @media (max-width: 400px) {
          .co-oto-image { max-height: 240px; }
        }

        /* ============ OTO REMINDER ============ */
        .co-oto-reminder {
          background: rgba(201, 168, 76,0.04);
          border: 1px solid rgba(201, 168, 76,0.25);
          border-radius: 14px;
          padding: 14px;
          margin-top: 16px;
          display: flex; align-items: center; gap: 14px;
          animation: coReminderIn 0.45s ease both;
        }
        @keyframes coReminderIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .co-reminder-thumb {
          width: 64px; height: 64px; border-radius: 10px;
          object-fit: cover; object-position: top center;
          flex-shrink: 0;
          border: 1px solid rgba(201, 168, 76,0.3);
        }
        .co-reminder-add {
          background: linear-gradient(135deg, #C9A84C, #C9A84C);
          color: #0A0E1A;
          font-size: 12px; font-weight: 800; letter-spacing: 0.04em;
          padding: 9px 16px; border-radius: 999px;
          border: none; cursor: pointer; white-space: nowrap;
          transition: var(--co-trans);
          box-shadow: 0 4px 12px rgba(201, 168, 76,0.3);
        }
        .co-reminder-add:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(201, 168, 76,0.45); }

        /* ============ CTA BUTTON ============ */
        .co-cta {
          width: 100%;
          padding: 22px 32px;
          background: linear-gradient(135deg, #C9A84C 0%, #C9A84C 40%, #C49040 100%);
          color: #0A0E1A;
          font-size: 17px; font-weight: 800; letter-spacing: 0.02em;
          border: none; border-radius: var(--co-radius-pill);
          cursor: pointer; position: relative; overflow: hidden;
          box-shadow:
            0 4px 0 #8B6820,
            0 8px 20px rgba(201, 168, 76,0.3),
            0 20px 60px rgba(201, 168, 76,0.2),
            inset 0 1px 0 rgba(255,255,255,0.25);
          transition: var(--co-trans);
        }
        .co-cta::before {
          content: ''; position: absolute; top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: coBtnShine 3s ease-in-out 1s infinite;
        }
        @keyframes coBtnShine {
          0% { left: -100%; } 30% { left: 150%; } 100% { left: 150%; }
        }
        .co-cta::after {
          content: ''; position: absolute; inset: -3px;
          border-radius: var(--co-radius-pill);
          border: 2px solid rgba(201, 168, 76,0.4);
          animation: coBtnPulse 2.5s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes coBtnPulse {
          0%,100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.015); }
        }
        .co-cta:hover {
          transform: translateY(-2px);
          box-shadow:
            0 6px 0 #8B6820,
            0 12px 28px rgba(201, 168, 76,0.4),
            0 28px 80px rgba(201, 168, 76,0.25),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .co-cta:active {
          transform: translateY(2px);
          box-shadow: 0 1px 0 #8B6820, 0 4px 12px rgba(201, 168, 76,0.3);
          transition: all 0.05s ease;
        }
        .co-cta:disabled { opacity: 0.85; pointer-events: none; }
        .co-cta:disabled::before { display: none; }
        .co-spinner {
          display: inline-block; width: 18px; height: 18px;
          border: 2.5px solid rgba(10,14,26,0.3);
          border-top-color: #0A0E1A;
          border-radius: 50%;
          animation: coSpin 0.7s linear infinite;
          margin-right: 10px; vertical-align: middle;
        }
        @keyframes coSpin { to { transform: rotate(360deg); } }

        /* ============ ORDER SUMMARY ============ */
        .co-summary {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(201, 168, 76,0.2);
          border-radius: var(--co-radius-lg);
          padding: 32px;
          box-shadow: inset 0 1px 0 rgba(201, 168, 76,0.1), 0 24px 64px rgba(0,0,0,0.4);
        }
        .co-total {
          font-size: 36px; font-weight: 800; color: #fff;
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .co-total.is-flipping { opacity: 0; transform: translateY(-8px); }
        .co-oto-summary-line {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px;
          background: rgba(201, 168, 76,0.06);
          border: 1px solid rgba(201, 168, 76,0.2);
          border-radius: 8px; margin-bottom: 12px;
          animation: coSlideDown 0.3s ease;
        }
        @keyframes coSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ============ GUARANTEE SEAL ============ */
        .co-seal { position: relative; width: 70px; height: 70px; flex-shrink: 0; }
        .co-seal::before {
          content: ''; position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid var(--co-gold);
          box-shadow: 0 0 0 4px rgba(201, 168, 76,0.05), 0 0 16px rgba(201, 168, 76,0.2);
        }
        .co-seal::after {
          content: ''; position: absolute; inset: 6px; border-radius: 50%;
          border: 1px solid rgba(201, 168, 76,0.4);
        }
        .co-seal-inner {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; line-height: 1.1;
        }

        /* ============ TRUST BADGES ============ */
        .co-trust-badge {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          transition: var(--co-trans);
        }
        .co-trust-badge:hover {
          border-color: rgba(201, 168, 76,0.25);
          background: rgba(255,255,255,0.04);
          transform: translateY(-1px);
        }
        .co-trust-icon {
          width: 36px; height: 36px; border-radius: 8px;
          background: rgba(201, 168, 76,0.08);
          border: 1px solid rgba(201, 168, 76,0.15);
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: var(--co-gold);
        }

        /* ============ REVIEW CARDS ============ */
        .co-review {
          background: rgba(255,255,255,0.022);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: var(--co-radius-md);
          padding: 28px;
          transition: var(--co-trans);
        }
        .co-review:hover {
          border-color: rgba(201, 168, 76,0.28);
          background: rgba(255,255,255,0.036);
          transform: translateY(-3px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(201, 168, 76,0.08);
        }
        .co-verified {
          display: inline-flex; align-items: center; gap: 4px;
          background: rgba(110,210,130,0.1);
          border: 1px solid rgba(110,210,130,0.2);
          border-radius: 20px; padding: 2px 8px;
          font-size: 9px; font-weight: 700; color: #6ED282;
          letter-spacing: 0.04em;
        }
        .co-helpful-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          cursor: pointer; transition: var(--co-trans);
          font-size: 11px; color: var(--co-muted);
        }
        .co-helpful-btn:hover {
          border-color: rgba(201, 168, 76,0.3);
          color: var(--co-gold);
        }

        /* ============ ANIMATIONS ============ */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.6s ease-out both; }

        .co-animate-in { opacity: 0; transform: translateY(24px); transition: opacity 0.55s ease, transform 0.55s ease; }
        .co-animate-in.is-visible { opacity: 1; transform: translateY(0); }

        @media (prefers-reduced-motion: reduce) {
          .co-cta::before, .co-cta::after { animation: none !important; }
          .co-animate-in { opacity: 1 !important; transform: none !important; }
        }

        /* ============ MOBILE ============ */
        @media (max-width: 768px) {
          .co-summary { padding: 24px; }
          .co-oto-card { padding: 0 !important; }
          .co-cta { padding: 20px 24px; font-size: 16px; }
        }
      `}</style>

      {/* SECTION 1: HEADER */}
      <header
        className="flex items-center justify-between px-6 lg:px-10"
        style={{
          padding: "14px 24px",
          background: "#0A0E1A",
          borderBottom: "1px solid rgba(201, 168, 76,0.15)",
        }}
      >
        <span className="font-serif text-xl lg:text-2xl tracking-wide text-white select-none">
          SEER<span className="text-[#C9A84C]">·</span>AI
        </span>
        <span className="flex items-center gap-2 text-[11px] font-medium text-[#C9A84C]">
          <Lock size={12} /> Secured by Shopify
        </span>
      </header>

      {/* SECTION 2: PROGRESS BAR */}
      <div className="px-6 pt-8 pb-2 max-w-md mx-auto">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-3 h-3 rounded-full bg-[#C9A84C]" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">Your Info</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-[#C9A84C] to-[#C9A84C]" />
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-3 h-3 rounded-full bg-[#C9A84C] ring-4 ring-[#C9A84C]/20" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#C9A84C]">Secure Checkout</span>
          </div>
        </div>
        <p className="text-center text-[11px] font-light text-white/50 mt-4">
          Final Step — Complete Your Order
        </p>
      </div>

      {/* SECTION 3: HEADLINE BLOCK */}
      <section className="px-6 lg:px-10 pt-10 pb-12 text-center max-w-3xl mx-auto fade-up">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#C9A84C] mb-5 font-semibold">
          The Dream Did Not Come By Accident
        </p>
        <h1 className="font-serif text-[26px] lg:text-[30px] leading-[1.25] font-bold text-white mb-6">
          Complete Your Order and Begin Receiving
          <br />
          Scripture-First Interpretation
          <br />
          of Every Dream God Sends You.
        </h1>
        <p className="text-[#C9A84C] text-sm lg:text-[14px] leading-relaxed max-w-2xl mx-auto">
          Protected by our 90-Day Money-Back Guarantee.
          <br />
          If SEER doesn't give you clarity you can use in prayer — we refund every dollar.
          No forms. No questions.
        </p>

        <div className="mt-8 flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-[11px] font-light text-white">
          {[
            { icon: <Lock size={12} className="text-[#C9A84C]" />, t: "SSL Encrypted" },
            { icon: <BookOpen size={12} className="text-[#C9A84C]" />, t: "Scripture-Only" },
            { icon: <RotateCcw size={12} className="text-[#C9A84C]" />, t: "90-Day Guarantee" },
            { icon: <Zap size={12} className="text-[#C9A84C]" />, t: "Instant Access" },
            { icon: <Shield size={12} className="text-[#C9A84C]" />, t: "Shopify Payments" },
          ].map((b, i, arr) => (
            <span key={b.t} className="flex items-center gap-2">
              <span className="flex items-center gap-1.5">{b.icon}{b.t}</span>
              {i < arr.length - 1 && <span className="text-white/30">·</span>}
            </span>
          ))}
        </div>
      </section>

      {/* SECTION 4: TWO-COLUMN CHECKOUT */}
      <form
        onSubmit={handleContinue}
        className="px-6 lg:px-10 pb-20 max-w-6xl mx-auto grid lg:grid-cols-[58fr_42fr] gap-8"
      >
        {/* RIGHT COLUMN — Order summary (appears first on mobile via order classes) */}
        <aside className="order-1 lg:order-2">
          <div className="co-summary lg:sticky lg:top-6 co-animate-in is-visible">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#C9A84C] font-bold mb-5">
              Order Summary
            </p>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)] text-[#C9A84C] flex-shrink-0 mt-1">
                <PlanIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-serif text-[26px] text-white tracking-tight leading-tight">{selectedPlan.name}</p>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-[46px] font-black text-[#C9A84C] leading-none tracking-tight">
                    {selectedPlan.priceDisplay}
                  </span>
                  <span className="text-base font-light text-white/55">{selectedPlan.priceSuffix}</span>
                </p>
                <p className="text-[12px] font-light text-white/45 mt-1.5">{selectedPlan.recurringText}</p>
              </div>
            </div>

            <div className="h-px my-5" style={{ background: "linear-gradient(to right, transparent, rgba(201, 168, 76,0.2), transparent)" }} />

            <p className="text-[9px] tracking-[0.18em] uppercase text-[#C9A84C] font-bold mb-3">
              What's Included
            </p>
            <ul className="flex flex-col gap-[11px]">
              {selectedPlan.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 font-serif text-[13px] text-[#F8F5EC] leading-snug">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0" style={{ background: "rgba(201, 168, 76,0.1)", border: "1.5px solid rgba(201, 168, 76,0.4)", color: "#C9A84C" }}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="h-px my-5" style={{ background: "linear-gradient(to right, transparent, rgba(201, 168, 76,0.2), transparent)" }} />

            {bump && (
              <div className="co-oto-summary-line">
                <span className="text-[12px] text-[#C9A84C]">+ The Watchman's Field Guide</span>
                <span className="text-[13px] font-bold text-[#C9A84C]">$27.00</span>
              </div>
            )}

            <div className="flex items-baseline justify-between">
              <span className="text-[10px] tracking-[0.18em] uppercase font-bold text-white/55">
                Total Today
              </span>
              <span className={`co-total ${totalFlip ? "is-flipping" : ""}`}>${totalToday}</span>
            </div>
            <p className="text-[12px] font-light text-white/40 mt-1 text-right">
              {selectedPlan.recurringText}
            </p>

            <div className="h-px my-5" style={{ background: "linear-gradient(to right, transparent, rgba(201, 168, 76,0.2), transparent)" }} />

            <div
              className="rounded-xl p-[18px] flex items-center gap-4"
              style={{
                background: "rgba(201, 168, 76,0.04)",
                border: "1px solid rgba(201, 168, 76,0.18)",
              }}
            >
              <div className="co-seal">
                <div className="co-seal-inner">
                  <span style={{ fontSize: 22, fontWeight: 900, color: "#C9A84C", lineHeight: 1 }}>90</span>
                  <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(201, 168, 76,0.8)", textTransform: "uppercase", textAlign: "center", lineHeight: 1.4, marginTop: 2 }}>
                    DAY<br />MONEY<br />BACK
                  </span>
                </div>
              </div>
              <div>
                <p className="font-bold text-[13px] text-white mb-1">90-Day Money-Back Guarantee</p>
                <p className="font-serif text-[12px] text-white/75 leading-[1.6]">
                  If SEER doesn't give you clarity you can use in prayer, we'll refund every dollar.
                  One email. No forms.
                </p>
              </div>
            </div>

            <p className="text-[11px] font-light text-white/35 italic text-center mt-5">
              Payment processed securely by Shopify.
              <br />
              Your card details never touch our servers.
            </p>
          </div>
        </aside>

        {/* LEFT COLUMN — Form */}
        <div className="order-2 lg:order-1 space-y-7">
          <div
            className="rounded-2xl p-7 lg:p-9"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(201, 168, 76,0.25)",
            }}
          >
            <p className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-[#C9A84C] font-bold mb-6">
              <Lock size={12} /> Your Order Information
            </p>

            <div className="space-y-5">
              <FieldLabel label="First Name" required>
                <input
                  type="text"
                  required
                  autoComplete="given-name"
                  placeholder="Your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputCls}
                />
              </FieldLabel>

              <FieldLabel label="Email Address" required helper="We'll send your access details here.">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </FieldLabel>

              <FieldLabel
                label="Phone (Optional)"
                helper="Receive prayer reminder texts when your interpretation is ready."
              >
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="(555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls}
                />
              </FieldLabel>

              {/* Payment divider */}
              <div className="co-pay-divider pt-2">
                <span className="co-pay-divider-label">
                  <span className="co-diamond">◆</span>
                  Payment Details
                  <span className="co-diamond">◆</span>
                </span>
              </div>

              <p className="text-[12px] font-light text-white/55 text-center -mt-1">
                You'll enter card details on Shopify's encrypted checkout in the next step.
              </p>

              {/* Payment method icons */}
              <div className="co-pay-icons">
                <span className="co-pay-icon" aria-label="Visa" title="Visa">
                  <svg viewBox="0 0 48 32" width="40" height="20"><rect width="48" height="32" rx="3" fill="#1A1F71"/><text x="24" y="22" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="900" fontStyle="italic" fontFamily="Arial">VISA</text></svg>
                </span>
                <span className="co-pay-icon" aria-label="Mastercard" title="Mastercard">
                  <svg viewBox="0 0 48 32" width="40" height="22"><rect width="48" height="32" rx="3" fill="#0A0E1A"/><circle cx="20" cy="16" r="8" fill="#EB001B"/><circle cx="28" cy="16" r="8" fill="#F79E1B" fillOpacity="0.9"/></svg>
                </span>
                <span className="co-pay-icon" aria-label="American Express" title="Amex">
                  <svg viewBox="0 0 48 32" width="40" height="20"><rect width="48" height="32" rx="3" fill="#2557D6"/><text x="24" y="21" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="900" fontFamily="Arial">AMEX</text></svg>
                </span>
                <span className="co-pay-icon" aria-label="Discover" title="Discover">
                  <svg viewBox="0 0 48 32" width="40" height="20"><rect width="48" height="32" rx="3" fill="#fff"/><text x="20" y="21" textAnchor="middle" fill="#000" fontSize="9" fontWeight="900" fontFamily="Arial">DISC</text><circle cx="38" cy="16" r="5" fill="#FF6000"/></svg>
                </span>
                <span className="co-pay-icon" aria-label="Apple Pay" title="Apple Pay">
                  <svg viewBox="0 0 48 32" width="40" height="20"><rect width="48" height="32" rx="3" fill="#000"/><text x="24" y="21" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600" fontFamily="-apple-system,Arial">Pay</text><path d="M14 14c-.5 0-1-.4-1-1 0-.6.5-1.2 1.1-1.3.1.6-.5 1.3-.1 2.3z" fill="#fff"/></svg>
                </span>
                <span className="co-pay-icon" aria-label="Google Pay" title="Google Pay">
                  <svg viewBox="0 0 48 32" width="40" height="20"><rect width="48" height="32" rx="3" fill="#fff"/><text x="24" y="21" textAnchor="middle" fill="#5F6368" fontSize="10" fontWeight="700" fontFamily="Arial">G Pay</text></svg>
                </span>
              </div>
              <p className="flex items-center justify-center gap-1.5 text-[10px] font-light text-white/40 mt-2">
                <Lock size={10} className="text-[#C9A84C]" /> Secured by Shopify
              </p>
            </div>

            {/* OTO CARD */}
            <div className="co-oto-wrap">
              <div className="co-oto-badge">One-Time Offer — Only Available Here</div>
              <div className={`co-oto-card ${bump ? "is-selected" : ""}`}>
                {/* PRODUCT IMAGE — TOP */}
                <div className="co-oto-image-wrap">
                  <img
                    src={otoFieldGuide}
                    alt="The Watchman's Field Guide — Scripture-first dream capture system"
                    loading="eager"
                    className="co-oto-image"
                  />
                </div>

                {/* CONTENT */}
                <div className="co-oto-body">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="co-oto-original">$97</span>
                    <span className="co-oto-sale">$27</span>
                    <span className="co-save-badge">SAVE $70</span>
                  </div>

                  <p className="font-serif font-bold text-[22px] text-white leading-tight">
                    The Watchman's Field Guide
                  </p>
                  <p className="italic text-[13px] text-[#C9A84C] mt-1 font-serif">
                    How to Capture, Decode &amp; Pray Through Every Dream Before It Fades
                  </p>

                  <p className="text-[13px] text-white/80 leading-[1.7] mt-4 font-serif">
                    The moment you wake from a significant dream, you have less than 90 seconds
                    before the details begin to disappear. This guide shows you exactly what to
                    capture — and how to know whose voice you heard.
                  </p>

                  <ul className="mt-4 flex flex-col gap-2 text-[13px] text-[#F8F5EC] font-serif">
                    {[
                      "The 90-Second Dream Capture System",
                      "The Three Voices Framework",
                      "50 Biblical Symbols Decoded",
                      "The Prophetic Prayer Protocol",
                      "Printable Dream Journal",
                    ].map((i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <span className="co-feature-dot">✦</span>
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>

                  <label
                    className="flex items-start gap-3 mt-5 cursor-pointer text-[13px] font-bold text-white leading-snug"
                    onClick={(e) => {
                      e.preventDefault();
                      setBump((v) => !v);
                    }}
                  >
                    <span
                      role="checkbox"
                      aria-checked={bump}
                      aria-label="Add The Watchman's Field Guide"
                      className={`co-check ${bump ? "is-on" : ""} mt-0.5`}
                    />
                    <span className="select-none">
                      YES — Add The Watchman's Field Guide to my order · $27
                    </span>
                  </label>

                  <p className="text-[11px] text-white/50 mt-3">
                    Instant PDF delivery · Keep forever · Never sold separately
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-7">
              <button ref={ctaRef} type="submit" disabled={submitting} className="co-cta">
                {submitting && <span className="co-spinner" />}
                <span>{ctaLabel}</span>
              </button>
              {formError && (
                <p className="mt-3 text-center text-[12px] text-[#E87070]">{formError}</p>
              )}
              <p className="mt-3 text-center text-[11px] font-light text-white/45 flex items-center justify-center gap-1.5">
                <Lock size={11} className="text-[#C9A84C]" />
                256-bit SSL · Powered by Shopify
              </p>

              {/* Last-chance OTO reminder — only when unchecked */}
              {!bump && showReminder && (
                <div className="co-oto-reminder">
                  <img
                    src={otoFieldGuide}
                    alt="The Watchman's Field Guide"
                    className="co-reminder-thumb"
                    loading="eager"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white leading-tight">
                      Don't forget your Field Guide
                    </p>
                    <p className="text-[12px] text-white/65 font-serif mt-0.5">
                      The Watchman's Field Guide is still available. Add it for $27.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBump(true)}
                    className="co-reminder-add"
                  >
                    Add $27
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* SECTION 5: FEATURED TESTIMONIAL */}
      <section
        className="relative px-6 lg:px-10 py-14 lg:py-16"
        style={{
          background: "rgba(201, 168, 76,0.04)",
          borderTop: "1px solid rgba(201, 168, 76,0.15)",
          borderBottom: "1px solid rgba(201, 168, 76,0.15)",
        }}
      >
        <div className="max-w-2xl mx-auto text-center relative">
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-[#C9A84C] mb-6">
            Why Believers Trust Seer
          </p>
          <div className="relative">
            <span
              className="absolute -top-6 -left-2 font-serif text-[64px] leading-none"
              style={{ color: "rgba(201, 168, 76,0.25)" }}
            >
              "
            </span>
            <blockquote className="font-serif italic text-[18px] lg:text-[20px] text-[#F8F5EC] leading-[1.7]">
              I've been in ministry 22 years. I've seen every kind of prophetic tool come and go.
              <br />
              <br />
              Most of them are dangerous. Unaccountable. New Age mixture. False certainty dressed up
              in Christian language.
              <br />
              <br />
              SEER is different in one way that matters above all else: it never claims to speak
              for God. It always points you back to Scripture, prayer, and your pastor.
              <br />
              <br />
              That humility is what makes it safe. That's what makes it trustworthy. That's why I use it.
            </blockquote>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2">
            <div
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center font-serif text-xl text-white"
              style={{
                background: "rgba(201, 168, 76,0.15)",
                border: "1px solid rgba(201, 168, 76,0.4)",
              }}
            >
              TR
            </div>
            <p className="font-bold text-[14px] text-white">Thomas R.</p>
            <p className="font-light text-[12px] text-white/55">
              Ministry Leader · 22 Years · Dallas, TX
            </p>
            <p className="font-bold text-[10px] text-[#C9A84C] flex items-center gap-2">
              <span className="text-[#C9A84C]">★★★★★</span> · Prophet's Circle Member
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 6: SOCIAL PROOF RATING */}
      <section className="px-6 py-10" style={{ background: "#0A0E1A" }}>
        <div className="max-w-md mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-[#C9A84C] text-xl">★★★★★</span>
            <span className="font-bold text-[24px] lg:text-[28px] text-[#C9A84C]">4.9 out of 5</span>
          </div>
          <p className="text-[13px] font-light text-white/55 mb-6">
            Based on 3,241 Scripture-first interpretations delivered
          </p>
          <div className="space-y-2">
            {[
              { stars: 5, pct: 89 },
              { stars: 4, pct: 8 },
              { stars: 3, pct: 2 },
              { stars: 2, pct: 1 },
              { stars: 1, pct: 0 },
            ].map(({ stars, pct }) => (
              <div key={stars} className="flex items-center gap-3 text-[11px] font-light text-white/50">
                <span className="w-12 text-left">{stars} stars</span>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: "#C9A84C" }}
                  />
                </div>
                <span className="w-8 text-right">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: REVIEW WALL */}
      <section className="px-6 lg:px-10 pt-6 pb-16" style={{ background: "#0A0E1A" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {REVIEWS.map((r) => (
            <article key={r.name + r.date} className="co-review">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                  style={{ background: "rgba(201, 168, 76,0.18)", border: "1px solid rgba(201, 168, 76,0.3)" }}
                >
                  {r.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[13px] text-white flex items-center gap-1.5">
                    {r.name}
                    <span className="co-verified">
                      <Check size={9} strokeWidth={3} /> VERIFIED
                    </span>
                  </p>
                  <span
                    className="inline-block mt-1 text-[9px] uppercase tracking-wider text-[#C9A84C] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(201, 168, 76,0.08)", border: "1px solid rgba(201, 168, 76,0.25)" }}
                  >
                    {r.tier}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-[#C9A84C] tracking-wide">★★★★★</span>
                <span className="font-light text-white/45">· {r.date}</span>
              </div>
              <h3 className="font-bold text-[14px] text-white mt-3 leading-snug">{r.headline}</h3>
              <p className="font-serif text-[13px] text-[#F8F5EC] leading-[1.75] mt-2 whitespace-pre-line opacity-90">
                {r.body}
              </p>
              <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-[11px] font-light text-white/45 mr-1">Helpful?</span>
                <button type="button" className="co-helpful-btn"><ThumbsUp size={11} /> {r.helpful}</button>
                <button type="button" className="co-helpful-btn"><ThumbsDown size={11} /> {r.unhelpful}</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* SECTION 8: TRUST BADGE WALL */}
      <section
        className="px-6 lg:px-10 py-14"
        style={{ background: "rgba(201, 168, 76,0.04)" }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {BADGES.map((b) => (
            <div key={b.title} className="co-trust-badge">
              <div className="co-trust-icon">{b.icon}</div>
              <div>
                <p className="font-bold text-[12px] text-white">{b.title}</p>
                <p className="font-light text-[10px] text-white/50 mt-0.5">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 9: 90-DAY GUARANTEE FULL */}
      <section
        className="px-6 lg:px-10 py-16 lg:py-20"
        style={{
          background: "rgba(201, 168, 76,0.04)",
          borderTop: "1px solid rgba(201, 168, 76,0.2)",
          borderBottom: "1px solid rgba(201, 168, 76,0.2)",
        }}
      >
        <div className="max-w-5xl mx-auto grid lg:grid-cols-[35fr_65fr] gap-10 items-center">
          <div className="flex justify-center">
            <div
              className="flex flex-col items-center justify-center"
              style={{
                width: 180,
                height: 180,
                borderRadius: "50%",
                border: "3px solid #C9A84C",
                background:
                  "radial-gradient(circle, rgba(201, 168, 76,0.12), transparent 70%)",
                boxShadow: "0 0 40px rgba(201, 168, 76,0.2)",
              }}
            >
              <span className="font-bold text-[42px] text-[#C9A84C] leading-none">90</span>
              <span className="font-light text-[11px] text-[#C9A84C] tracking-[0.2em] mt-1">DAY</span>
              <span className="font-light text-[9px] text-[#C9A84C] tracking-[0.2em] mt-2">MONEY BACK</span>
              <span className="font-light text-[9px] text-[#C9A84C] tracking-[0.2em]">GUARANTEE</span>
            </div>
          </div>

          <div>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#C9A84C] mb-3">
              Our Promise to You
            </p>
            <h2 className="font-serif text-[28px] lg:text-[30px] text-white leading-tight">
              90 Days. No Questions.
              <br />
              Every Dollar Back.
            </h2>
            <div className="font-serif text-[14px] text-[#F8F5EC] leading-[1.8] mt-5 space-y-3">
              <p>
                We believe what God shows you in dreams is worth taking seriously. And we believe
                SEER AI is the most Scripture-faithful tool available for doing exactly that.
              </p>
              <p>But we're not asking you to take our word.</p>
              <p>
                Try SEER AI for 90 days. Submit your dreams. Receive your interpretations. Pray
                through what God reveals.
              </p>
              <p>
                If at any point in those 90 days you feel like SEER hasn't delivered
                Scripture-grounded clarity worth every dollar you spent — email us once. We'll
                refund everything. No forms. No waiting. No judgment.
              </p>
            </div>
            <p className="italic text-[13px] text-[#C9A84C] mt-5">
              "Let your 'Yes' be 'Yes.'" — Matthew 5:37
            </p>
            <p className="text-[13px] text-white/70 mt-2">That's our guarantee. Our yes means yes.</p>

            <div className="grid grid-cols-3 gap-4 mt-7">
              {[
                { n: "97%", d: "of members never request a refund" },
                { n: "90 days", d: "full protection (industry: 14)" },
                { n: "< 24hrs", d: "average refund time" },
              ].map((s) => (
                <div key={s.n}>
                  <p className="font-bold text-[20px] lg:text-[24px] text-[#C9A84C]">{s.n}</p>
                  <p className="text-[12px] text-white/60 mt-1 leading-snug">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10: FAQ */}
      <section className="px-6 lg:px-10 py-16 lg:py-20 max-w-3xl mx-auto">
        <h2 className="font-serif text-[26px] lg:text-[28px] text-white text-center mb-8 leading-tight">
          You Probably Have Questions.
          <br />
          Here Are the Honest Answers.
        </h2>
        <div className="space-y-2">
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <div
                key={f.q}
                className="rounded-[10px] transition-all"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${open ? "rgba(201, 168, 76,0.3)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left"
                >
                  <span className="font-bold text-[14px] text-white">{f.q}</span>
                  {open ? (
                    <Minus size={18} className="text-[#C9A84C] flex-shrink-0" />
                  ) : (
                    <Plus size={18} className="text-[#C9A84C] flex-shrink-0" />
                  )}
                </button>
                {open && (
                  <div className="px-6 pb-5 font-serif text-[13px] text-[#F8F5EC] leading-[1.7]">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 11: FINAL CTA */}
      <section
        className="px-6 lg:px-10 py-20 text-center"
        style={{ background: "#0A0E1A" }}
      >
        <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-[#C9A84C] mb-4">
          God Is Still Speaking
        </p>
        <h2 className="font-serif text-[28px] lg:text-[32px] text-white leading-tight">
          Don't Let Another Dream
          <br />
          Go Uninterpreted.
        </h2>
        <p className="italic text-[14px] text-[#C9A84C] mt-6 max-w-xl mx-auto leading-relaxed">
          "Call to me and I will answer you, and will tell you great and hidden things that you
          have not known."
          <br />
          — Jeremiah 33:3
        </p>

        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="co-cta mt-8"
          style={{ width: "auto", maxWidth: 480, padding: "22px 44px" }}
        >
          <span>Complete My Order — Begin My Journey →</span>
        </button>

        <p className="text-[12px] text-white/55 mt-6">
          Secure · 90-Day Guarantee · Scripture-Only · Cancel Anytime
        </p>
      </section>

      {/* SECTION 12: FOOTER */}
      <footer
        className="px-6 py-10 text-center space-y-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="font-serif text-sm text-white/70">
          SEER<span className="text-[#C9A84C]">·</span>AI
        </p>
        <p className="text-[11px] text-white/45 space-x-3">
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[#C9A84C]">
            Privacy
          </a>
          <span>·</span>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-[#C9A84C]">
            Terms
          </a>
          <span>·</span>
          <a href="/refund" target="_blank" rel="noopener noreferrer" className="hover:text-[#C9A84C]">
            Refund Policy
          </a>
        </p>
        <p className="text-[11px] text-white/40">
          © {new Date().getFullYear()} SEER AI. All rights reserved.
        </p>
        <p className="text-[10px] font-light text-white/35 max-w-lg mx-auto">
          SEER AI is a Scripture-first interpretation tool. It does not claim to deliver prophetic
          words or replace pastoral counsel.
        </p>
      </footer>
    </main>
  );
}

const inputCls = "co-input";

function FieldLabel({
  label,
  required,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="co-field block">
      <span className="co-field-label">
        {label}
        {required && <span className="text-[#C9A84C]">*</span>}
      </span>
      {children}
      {helper && (
        <span className="block mt-1.5 text-[11px] font-light text-white/45">{helper}</span>
      )}
    </label>
  );
}


const REVIEWS = [
  {
    name: "Imani R.",
    tier: "Watchman Member",
    date: "8 months ago",
    headline: "I stopped carrying my dreams alone.",
    body: `For three years I journaled dreams with no framework. Just writing them down and hoping something clicked.

SEER gave me what I was missing — not someone else's interpretation of what God was saying to me, but a Scripture-grounded lens I could take into prayer myself.

That's the difference. It never pretends to speak for God. It helps you seek Him.

I submitted 11 dreams last month. Each one opened something in my prayer life.`,
    helpful: 234,
    unhelpful: 2,
  },
  {
    name: "Thomas R.",
    tier: "Prophet's Circle · Leader",
    date: "4 months ago",
    headline: "22 years in ministry. This is the first tool I'd recommend.",
    body: `I've been burned by prophetic tools before. Most of them are dangerous. They speak with false certainty. They offer "words" without accountability.

SEER is the opposite of all of that.

It consistently pointed me back to Scripture. It reminded me to take interpretations to my pastor. It never claimed to speak for God.

That theological humility is what makes it trustworthy. My ministry team uses it now.`,
    helpful: 189,
    unhelpful: 1,
  },
  {
    name: "Marisol S.",
    tier: "Watchman Member",
    date: "11 months ago",
    headline: "My clients come to sessions with Scripture now.",
    body: `I'm a Christian therapist. Three clients were carrying dreams creating real anxiety.

Within 4 weeks of using SEER: my clients had language for what they were experiencing spiritually. They came with Scripture. They came ready to pray.

One client said it was the first time she felt like her dream was something God was doing — not something happening TO her.

I now recommend it to every believing client I work with.`,
    helpful: 167,
    unhelpful: 3,
  },
  {
    name: "Marcus D.",
    tier: "Prophet's Circle · Vetted Leader",
    date: "7 months ago",
    headline: "I recommend this from my pulpit.",
    body: `I have a congregation of 340 people. Many bring me dreams weekly. I love them, but I cannot give every dream the deep biblical symbol work it deserves.

SEER fills that gap responsibly.

I've seen 3 families testify that a SEER interpretation led them to a critical prayer breakthrough. Three real people. Three real testimonies.

I tell my congregation: this is a tool, not a prophet. Use it as such. That's what makes it safe.`,
    helpful: 312,
    unhelpful: 4,
  },
  {
    name: "Sarah K.",
    tier: "Watchman Annual",
    date: "3 months ago",
    headline: "SEER made me a better intercessor.",
    body: `I intercede for my city. I dream almost every night.

Before SEER, most were just question marks. Now every significant dream gets submitted. I receive the Scripture. I pray.

Last month a dream I almost didn't write down led me to a three-day fast for my city. Something broke in the spirit. I felt it in my bones.

Don't let your dreams be question marks.`,
    helpful: 142,
    unhelpful: 2,
  },
  {
    name: "Daniel K.",
    tier: "Seeker Member",
    date: "5 months ago",
    headline: "A skeptical pastor's honest review.",
    body: `I don't touch things that aren't grounded in Scripture. That was my position going in.

What changed my mind: in my first interpretation, SEER cited 7 Scripture passages, cross-referenced Daniel, Ezekiel, and Revelation, and ended with "bring this to prayer and your spiritual leadership."

That's not a New Age tool. That's a biblical framework.

I use it weekly now. Still watching every word through a theological lens. Which is exactly how you should use any prophetic tool.`,
    helpful: 201,
    unhelpful: 5,
  },
];

const BADGES = [
  { icon: <Lock size={18} />, title: "256-Bit SSL Encrypted", sub: "Bank-grade security" },
  { icon: <BookOpen size={18} />, title: "Scripture-First Always", sub: "Zero New Age mixture" },
  { icon: <RotateCcw size={18} />, title: "90-Day Guarantee", sub: "Full refund. No questions." },
  { icon: <Shield size={18} />, title: "Private & Encrypted", sub: "Your dream stays yours" },
  { icon: <XCircle size={18} />, title: "Cancel Anytime", sub: "No contracts. No penalties." },
  { icon: <Zap size={18} />, title: "Instant Access", sub: "Interpretation in minutes" },
  { icon: <Star size={18} />, title: "4.9/5 Average Rating", sub: "3,241 interpretations delivered" },
  { icon: <Cross size={18} />, title: "Theologically Accountable", sub: "Always points back to your pastor" },
];

const FAQS = [
  {
    q: "Is this biblically safe?",
    a: "Every interpretation SEER produces is grounded exclusively in Scripture. We never claim to speak for God directly. We never use New Age frameworks, Jungian psychology, or astrology. Every symbol is traced to its biblical counterpart. Every interpretation ends with a prayer direction and a recommendation to bring it to your pastor. Theologically accountable from start to finish.",
  },
  {
    q: "What if I'm not sure my dreams are from God?",
    a: "That's exactly what SEER is for. Most dreams aren't prophetic. But some are. The problem is you can't always tell which is which without a biblical framework. SEER gives you that framework — helping you discern, which is exactly what Scripture instructs.",
  },
  {
    q: "What happens after my trial?",
    a: "You choose your plan: Seeker ($24.99/month), Watchman ($47/month, unlimited), or cancel entirely — no penalty. Your interpretation history is always accessible even if you cancel.",
  },
  {
    q: "Is my dream completely private?",
    a: "Yes. 100%. Your dreams are encrypted. Never shared. Never sold. Never read by staff. Between you, SEER AI, and God. That's it.",
  },
  {
    q: "What if I want a refund?",
    a: "Email support@seeral.com within 90 days. One email. Full refund. No forms. No waiting. No questions. We mean what we say.",
  },
  {
    q: "Does this replace my pastor or spiritual leader?",
    a: "No. And it's not designed to. SEER is a tool — not a prophet, not a counselor, not a replacement for spiritual community. Every interpretation encourages you to bring what you've received to a trusted pastor. That accountability is built into the system.",
  },
  {
    q: "What is The Watchman's Field Guide?",
    a: "It's a 37-page PDF guide that teaches you exactly what to do in the 90 seconds after waking from a significant dream — before the details fade. It includes how to distinguish God's voice from your own and from the enemy's, 50 biblical symbols decoded with Scripture, and a prophetic prayer protocol. Available only on this page for $27.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. Anytime. No hoops. No cancellation fees. No guilt trips. One click in your dashboard. That's it.",
  },
];
