import type { ColorScheme, Particle } from '../types';
import { COLOR_PALETTES, rgbToRgba } from '../utils/colors';

const MAX_PARTICLES = 600;

export function createParticleSystem() {
  const particles: Particle[] = [];

  function spawnParticles(
    cx: number,
    cy: number,
    count: number,
    energy: number,
    palette: ReturnType<typeof COLOR_PALETTES[keyof typeof COLOR_PALETTES]>,
    frequencyData: Uint8Array
  ) {
    const colors = [palette.primary, palette.secondary, palette.tertiary];

    for (let i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) break;

      // Spawn from circular distribution
      const angle = Math.random() * Math.PI * 2;
      const spawnR = 20 + Math.random() * 80 * energy;
      const speed = 0.5 + Math.random() * 4 * energy;
      const freqIdx = Math.floor(Math.random() * frequencyData.length);
      const freqEnergy = frequencyData[freqIdx] / 255;

      particles.push({
        x: cx + Math.cos(angle) * spawnR,
        y: cy + Math.sin(angle) * spawnR,
        vx: Math.cos(angle) * speed * (0.5 + freqEnergy),
        vy: Math.sin(angle) * speed * (0.5 + freqEnergy) - Math.random() * 2,
        life: 1,
        maxLife: 0.8 + Math.random() * 1.2,
        size: 1 + Math.random() * 3 * energy,
        color: colors[Math.floor(Math.random() * colors.length)],
        hue: Math.random() * 360,
      });
    }
  }

  function update(dt: number) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vy += 0.02 * dt * 60; // gravity
      p.vx *= 0.99;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    for (const p of particles) {
      const alpha = p.life * p.life;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 4;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  return { particles, spawnParticles, update, render };
}

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  frequencyData: Uint8Array,
  width: number,
  height: number,
  sensitivity: number,
  colorScheme: ColorScheme,
  isBeat: boolean,
  bassEnergy: number,
  midEnergy: number,
  trebleEnergy: number,
  particleSystem: ReturnType<typeof createParticleSystem>,
  dt: number
) {
  const palette = COLOR_PALETTES[colorScheme];
  const cx = width / 2;
  const cy = height / 2;

  // Trail effect — don't fully clear
  ctx.fillStyle = 'rgba(7, 6, 15, 0.25)';
  ctx.fillRect(0, 0, width, height);

  // Central energy orb
  const orbR = 40 + bassEnergy * 60 * sensitivity;
  const orbGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR);
  orbGrad.addColorStop(0, rgbToRgba(palette.secondary, 0.9));
  orbGrad.addColorStop(0.3, rgbToRgba(palette.primary, 0.5));
  orbGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
  ctx.fill();

  // Frequency ring around orb
  const ringCount = 80;
  const ringStep = Math.floor(frequencyData.length / ringCount);
  for (let i = 0; i < ringCount; i++) {
    let sum = 0;
    for (let j = 0; j < ringStep; j++) sum += frequencyData[i * ringStep + j] || 0;
    const norm = Math.min(1, (sum / ringStep / 255) * sensitivity * 1.5);
    const angle = (i / ringCount) * Math.PI * 2;
    const r1 = orbR + 5;
    const r2 = orbR + 5 + norm * 100;

    const x1 = cx + Math.cos(angle) * r1;
    const y1 = cy + Math.sin(angle) * r1;
    const x2 = cx + Math.cos(angle) * r2;
    const y2 = cy + Math.sin(angle) * r2;

    const t = i / ringCount;
    let color: string;
    if (t < 0.33) color = palette.primary;
    else if (t < 0.66) color = palette.secondary;
    else color = palette.tertiary;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6 + norm * 0.4;
    ctx.shadowColor = color;
    ctx.shadowBlur = norm * 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Spawn particles based on energy
  const spawnCount = Math.floor(bassEnergy * 8 * sensitivity) +
    Math.floor(midEnergy * 4 * sensitivity) +
    Math.floor(trebleEnergy * 2 * sensitivity);

  if (spawnCount > 0) {
    particleSystem.spawnParticles(cx, cy, spawnCount, (bassEnergy + midEnergy) * sensitivity, palette, frequencyData);
  }

  // Beat burst
  if (isBeat && bassEnergy > 0.15) {
    particleSystem.spawnParticles(cx, cy, 30, bassEnergy * 2, palette, frequencyData);
  }

  particleSystem.update(dt);
  particleSystem.render(ctx, width, height);

  // Edge glow on beat
  if (isBeat && bassEnergy > 0.15) {
    for (let side = 0; side < 4; side++) {
      const edgeGrad = ctx.createLinearGradient(
        side === 0 ? 0 : side === 1 ? width : 0,
        side === 2 ? 0 : side === 3 ? height : 0,
        side === 0 ? 30 : side === 1 ? width - 30 : 0,
        side === 2 ? 30 : side === 3 ? height - 30 : 0
      );
      edgeGrad.addColorStop(0, rgbToRgba(palette.primary, 0.3 * bassEnergy));
      edgeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, 0, width, height);
    }
  }
}
