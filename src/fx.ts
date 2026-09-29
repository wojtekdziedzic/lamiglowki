import { COLORS } from './config';

export const reducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Piece {
  x: number; y: number; vx: number; vy: number;
  rot: number; vr: number; w: number; h: number; color: string;
}

/** One-shot confetti burst on a full-screen canvas that removes itself. */
export function confetti(): void {
  if (reducedMotion()) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  document.body.appendChild(canvas);
  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const g = canvas.getContext('2d');
  if (!g) { canvas.remove(); return; }
  g.scale(dpr, dpr);

  const pieces: Piece[] = [];
  for (let i = 0; i < 140; i++) {
    const fromLeft = i % 2 === 0;
    pieces.push({
      x: fromLeft ? -10 : W + 10,
      y: H * (0.55 + Math.random() * 0.25),
      vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 7),
      vy: -(9 + Math.random() * 9),
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 6,
      h: 10 + Math.random() * 8,
      color: COLORS[i % COLORS.length],
    });
  }

  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    g.clearRect(0, 0, W, H);
    for (const p of pieces) {
      p.vy += 0.35;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.globalAlpha = Math.max(0, 1 - t / 2600);
      g.fillStyle = p.color;
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
      g.restore();
    }
    if (t < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/** Small squash-and-settle when a ball lands. */
export function bounce(el: HTMLElement): void {
  if (reducedMotion() || !el.animate) return;
  el.animate(
    [
      { transform: 'translateY(0) scale(1, 1)' },
      { transform: 'translateY(2px) scale(1.12, 0.86)', offset: 0.35 },
      { transform: 'translateY(-3px) scale(0.96, 1.04)', offset: 0.7 },
      { transform: 'translateY(0) scale(1, 1)' },
    ],
    { duration: 220, easing: 'ease-out' },
  );
}
