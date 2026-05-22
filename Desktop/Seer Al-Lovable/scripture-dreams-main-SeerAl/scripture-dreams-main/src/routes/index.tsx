import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Nav } from "@/components/seer/Nav";
import { Hero } from "@/components/seer/Hero";
import { Recognition } from "@/components/seer/Recognition";
import { Tension } from "@/components/seer/Tension";
import { Scripture } from "@/components/seer/Scripture";
import { Trust } from "@/components/seer/Trust";
import { DreamPreview } from "@/components/seer/DreamPreview";
import { Pricing } from "@/components/seer/Pricing";
import { Testimonials } from "@/components/seer/Testimonials";
import { Footer } from "@/components/seer/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seer AI — Scripture-First Dream Discernment" },
      {
        name: "description",
        content:
          "Bible-backed dream reflection software for believers. Thoughtful symbolic clarity, prayerful insight, and Scripture mapping — without mysticism or false prophecy.",
      },
      { property: "og:title", content: "Seer AI — Scripture-First Dream Discernment" },
      {
        property: "og:description",
        content:
          "Premium, grounded dream reflection for believers. Scripture-first. Privacy-held.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    if (typeof window !== "undefined" && !window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <main className="relative bg-background text-foreground overflow-x-hidden">
      <Nav />
      <Hero />
      <Recognition />
      <Tension />
      <Scripture />
      <Trust />
      <div id="how" />
      <DreamPreview />
      <Pricing />
      <Testimonials />
      <Footer />
    </main>
  );
}
