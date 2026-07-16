// Pooled-particle canvas effects engine.
//
// One FxEngine drives every board effect: pixel-fracture shards, sparks,
// impact rings, launch trails, fever ambience, and win confetti. It is
// deliberately allocation-light (a single reusable particle array) and
// self-throttling: if frames run slow, spawn density scales down before
// gameplay smoothness is affected.

export type FxMode = 'full' | 'reduced' | 'off';

type Kind = 'shard' | 'spark' | 'ring' | 'confetti' | 'trail';

interface Particle {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  age: number;
  life: number;
  grav: number;
}

const MAX_PARTICLES = 900;

export class FxEngine {
  mode: FxMode = 'full';
  private ps: Particle[] = [];
  private density = 1; // auto performance scale 0.35..1
  private frameAvg = 16;

  get count() {
    return this.ps.length;
  }

  /** Feed real frame times so density adapts to the device. */
  noteFrame(dtMs: number) {
    this.frameAvg = this.frameAvg * 0.95 + dtMs * 0.05;
    if (this.frameAvg > 26 && this.density > 0.35) this.density -= 0.01;
    else if (this.frameAvg < 18 && this.density < 1) this.density += 0.005;
  }

  private budget(n: number): number {
    if (this.mode === 'off') return 0;
    const scaled = n * this.density * (this.mode === 'reduced' ? 0.4 : 1);
    const room = MAX_PARTICLES - this.ps.length;
    return Math.max(0, Math.min(Math.round(scaled), room));
  }

  private push(p: Particle) {
    if (this.ps.length < MAX_PARTICLES) this.ps.push(p);
  }

  /** Pixel-fracture burst at a cleared cell. */
  burst(x: number, y: number, color: string, cellSize: number, intensity = 1) {
    const shards = this.budget(4 * intensity);
    for (let i = 0; i < shards; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 180 * intensity;
      this.push({
        kind: 'shard',
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 80,
        size: cellSize * (0.14 + Math.random() * 0.2),
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 10,
        color,
        age: 0,
        life: 0.55 + Math.random() * 0.35,
        grav: 620,
      });
    }
    const sparks = this.budget(3 * intensity);
    for (let i = 0; i < sparks; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 240;
      this.push({
        kind: 'spark',
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: 1.5 + Math.random() * 2.5,
        rot: 0, vr: 0,
        color,
        age: 0,
        life: 0.3 + Math.random() * 0.25,
        grav: 200,
      });
    }
  }

  /** Expanding impact ring. */
  ring(x: number, y: number, color: string, big = false) {
    if (this.mode === 'off') return;
    this.push({
      kind: 'ring',
      x, y, vx: 0, vy: 0,
      size: big ? 90 : 46,
      rot: 0, vr: 0,
      color,
      age: 0,
      life: big ? 0.5 : 0.35,
      grav: 0,
    });
  }

  /** Launch trail puff (called several times along the flight path). */
  trail(x: number, y: number, color: string) {
    const n = this.budget(2);
    for (let i = 0; i < n; i++) {
      this.push({
        kind: 'trail',
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 30,
        vy: 40 + Math.random() * 60,
        size: 3 + Math.random() * 4,
        rot: 0, vr: 0,
        color,
        age: 0,
        life: 0.3 + Math.random() * 0.2,
        grav: -60,
      });
    }
  }

  /** Celebration confetti raining from the top of the canvas. */
  confetti(w: number, colors: string[]) {
    const n = this.budget(90);
    for (let i = 0; i < n; i++) {
      this.push({
        kind: 'confetti',
        x: Math.random() * w,
        y: -20 - Math.random() * 120,
        vx: (Math.random() - 0.5) * 60,
        vy: 90 + Math.random() * 140,
        size: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 8,
        color: colors[(Math.random() * colors.length) | 0],
        age: 0,
        life: 2.2 + Math.random() * 1.4,
        grav: 40,
      });
    }
  }

  /** Ambient fever sparkles, call once per frame while fever is active. */
  feverTick(w: number, h: number, colors: string[]) {
    if (this.mode !== 'full') return;
    if (Math.random() > 0.35 * this.density) return;
    this.push({
      kind: 'spark',
      x: Math.random() * w,
      y: h + 6,
      vx: (Math.random() - 0.5) * 30,
      vy: -60 - Math.random() * 120,
      size: 1.5 + Math.random() * 2.5,
      rot: 0, vr: 0,
      color: colors[(Math.random() * colors.length) | 0],
      age: 0,
      life: 0.9 + Math.random() * 0.6,
      grav: -30,
    });
  }

  update(dt: number) {
    const ps = this.ps;
    let n = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.kind === 'confetti') p.vx += Math.sin(p.age * 6 + p.size) * 14 * dt;
      ps[n++] = p;
    }
    ps.length = n;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const ps = this.ps;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const t = p.age / p.life;
      const fade = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      ctx.globalAlpha = fade;
      switch (p.kind) {
        case 'shard': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          const s = p.size;
          ctx.fillRect(-s / 2, -s / 2, s, s);
          ctx.globalAlpha = fade * 0.5;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-s / 2, -s / 2, s, s * 0.28);
          ctx.restore();
          break;
        }
        case 'spark':
        case 'trail': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'ring': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, 5 * (1 - t));
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6 + p.size * t, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'confetti': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.sin(p.age * 9 + p.size));
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
          ctx.restore();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
