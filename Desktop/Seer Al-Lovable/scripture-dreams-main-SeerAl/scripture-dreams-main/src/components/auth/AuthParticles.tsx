import React, { useEffect, useRef } from "react";

export const AuthParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      alpha: number;
      alphaSpeed: number;
      baseAlpha: number;
    }> = [];

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      const particleCount = Math.min(40, Math.floor((canvas.width * canvas.height) / 30000));
      particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.05 - 0.05, // slowly drifting upwards
        alpha: Math.random() * 0.5 + 0.1,
        alphaSpeed: Math.random() * 0.005 + 0.002,
        baseAlpha: Math.random() * 0.4 + 0.1,
      }));
    };

    // Accessibility check
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#C9A84C"; // brand gold

      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.globalAlpha = p.alpha;
        ctx.fill();

        if (!prefersReducedMotion) {
          // Update position
          p.x += p.vx;
          p.y += p.vy;

          // Wrap boundaries
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = canvas.height;

          // Pulse alpha
          p.alpha = p.baseAlpha + Math.sin(Date.now() * p.alphaSpeed) * 0.15;
          if (p.alpha < 0.05) p.alpha = 0.05;
          if (p.alpha > 0.8) p.alpha = 0.8;
        }
      });

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        // Draw static particles once
        particles.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        });
      }
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: "screen" }}
      aria-hidden="true"
    />
  );
};
export default AuthParticles;
