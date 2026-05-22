import React, { useState, useEffect } from "react";
import { AuthParticles } from "./AuthParticles";

interface AuthBackgroundProps {
  children: React.ReactNode;
}

export const AuthBackground: React.FC<AuthBackgroundProps> = ({ children }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden bg-[#0A0E1A] text-[#F8F5EC] flex flex-col justify-between"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background vignette & overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(10,14,26,0.95)_100%)] pointer-events-none z-10" />

      {/* Mouse reactive radial glow */}
      {!prefersReducedMotion && isHovered && (
        <div
          className="absolute pointer-events-none transition-opacity duration-700 ease-out z-0"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
            width: "600px",
            height: "600px",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(201, 168, 76, 0.08) 0%, rgba(201, 168, 76, 0.02) 50%, transparent 70%)",
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* Static/ambient radial gold glow behind form */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
        style={{
          width: "800px",
          height: "800px",
          background:
            "radial-gradient(circle, rgba(201, 168, 76, 0.04) 0%, rgba(201, 168, 76, 0.01) 60%, transparent 80%)",
        }}
      />

      {/* Volumetric Gold Light Beams */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
        <div
          className={`absolute top-[-10%] left-[10%] w-[40%] h-[120%] bg-gradient-to-b from-transparent via-[rgba(201,168,76,0.03)] to-transparent blur-[120px] transform rotate-[15deg] origin-top ${
            prefersReducedMotion ? "" : "animate-pulse"
          }`}
          style={{ animationDuration: "12s" }}
        />
        <div
          className={`absolute top-[-10%] right-[15%] w-[35%] h-[120%] bg-gradient-to-b from-transparent via-[rgba(201,168,76,0.025)] to-transparent blur-[100px] transform rotate-[-20deg] origin-top ${
            prefersReducedMotion ? "" : "animate-pulse"
          }`}
          style={{ animationDuration: "18s", animationDelay: "2s" }}
        />
      </div>

      {/* Canvas Particle System */}
      <AuthParticles />

      {/* Fine Film Grain overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')] z-10" />

      {/* Content wrapper */}
      <div className="relative w-full flex-grow flex flex-col z-20">
        {children}
      </div>
    </div>
  );
};
export default AuthBackground;
