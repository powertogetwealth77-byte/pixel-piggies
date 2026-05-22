import { useEffect, useRef } from "react";

/**
 * Adds `is-visible` to the element when it enters the viewport.
 * Pair with the `.reveal-up` utility in styles.css for staggered fade-up.
 * Respects prefers-reduced-motion (auto-reveals immediately).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // Arm the animation only after mount, so SSR/no-JS users see content.
    node.classList.add("reveal-prepped");

    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      requestAnimationFrame(() => node.classList.add("is-visible"));
      return;
    }

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add("is-visible");
          obs.unobserve(e.target);
        }
      });
    }, options);

    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return ref;
}
