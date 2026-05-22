import { Link } from "@tanstack/react-router";

export function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-full border border-gold/40 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-gold glow-pulse" />
          </div>
          <span className="font-display text-xl tracking-wide text-ivory">Seer<span className="text-gold"> AI</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-9 text-sm text-muted-foreground">
          <a href="#preview" className="hover:text-ivory transition-colors">Decode</a>
          <a href="#trust" className="hover:text-ivory transition-colors">Approach</a>
          <a href="#pricing" className="hover:text-ivory transition-colors">Plans</a>
          <a href="#testimonials" className="hover:text-ivory transition-colors">Interpretations</a>
        </nav>
        <a
          href="#pricing"
          className="btn-2030 btn-gold-2030 btn-2030-sm"
        >
          Decode My Dream
        </a>
      </div>
    </header>
  );
}
