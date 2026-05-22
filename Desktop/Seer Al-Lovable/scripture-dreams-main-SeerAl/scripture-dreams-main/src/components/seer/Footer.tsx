export function Footer() {
  return (
    <footer className="relative border-t border-border/60 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-20">
          <p className="text-xs tracking-[0.3em] uppercase text-gold mb-6">Begin Gently</p>
          <h2 className="font-display text-4xl lg:text-6xl text-ivory leading-tight max-w-3xl mx-auto mb-10">
            The dream came to you for a reason. Sit with it under Scripture.
          </h2>
          <a
            href="#preview"
            className="group btn-2030 btn-gold-2030 btn-2030-lg"
          >
            Begin My Dream Reading
            <span className="btn-arrow">→</span>
          </a>
        </div>

        <div className="hairline mb-10" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full border border-gold/40 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-gold" />
            </div>
            <span className="font-display text-base text-ivory">Seer<span className="text-gold"> AI</span></span>
            <span className="ml-3 tracking-wide">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 tracking-wide">
            <a href="#" className="hover:text-ivory transition-colors">Privacy</a>
            <a href="#" className="hover:text-ivory transition-colors">Terms</a>
            <a href="#" className="hover:text-ivory transition-colors">Statement of Faith</a>
            <a href="#" className="hover:text-ivory transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
