import type { ColorScheme } from '../types';
import { COLOR_PALETTES, rgbToRgba } from '../utils/colors';

export function renderCircular(
  ctx: CanvasRenderingContext2D,
  frequencyData: Uint8Array,
  width: number,
  height: number,
  sensitivity: number,
  colorScheme: ColorScheme,
  isBeat: boolean,
  bassEnergy: number,
  time: number
) {
  const palette = COLOR_PALETTES[colorScheme];
  const cx = width / 2;
  const cy = height / 2;

  ctx.fillStyle = '#07060F';
  ctx.fillRect(0, 0, width, height);

  const baseRadius = Math.min(width, height) * 0.22;
  const beatPulse = isBeat ? bassEnergy * 20 : 0;
  const radius = baseRadius + beatPulse;
  const barCount = 160;
  const step = Math.floor(frequencyData.length / barCount);

  // Outer glow ring on beat
  if (isBeat && bassEnergy > 0.12) {
    const glowRad = radius + 60;
    const glowGrad = ctx.createRadialGradient(cx, cy, radius, cx, cy, glowRad);
    glowGrad.addColorStop(0, rgbToRgba(palette.primary, 0.4 * bassEnergy));
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw radial bars
  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) {
      sum += frequencyData[i * step + j] || 0;
    }
    const raw = sum / step / 255;
    const normalized = Math.min(1, raw * sensitivity * 1.5);
    const barLen = normalized * Math.min(width, height) * 0.28;

    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(angle) * radius;
    const y1 = cy + Math.sin(angle) * radius;
    const x2 = cx + Math.cos(angle) * (radius + barLen);
    const y2 = cy + Math.sin(angle) * (radius + barLen);

    // Color based on position
    const t = i / barCount;
    let color: string;
    if (t < 0.5) {
      const blend = t * 2;
      const r1 = parseInt(palette.primary.slice(1, 3), 16);
      const g1 = parseInt(palette.primary.slice(3, 5), 16);
      const b1 = parseInt(palette.primary.slice(5, 7), 16);
      const r2 = parseInt(palette.secondary.slice(1, 3), 16);
      const g2 = parseInt(palette.secondary.slice(3, 5), 16);
      const b2 = parseInt(palette.secondary.slice(5, 7), 16);
      color = `rgb(${Math.round(r1 + (r2 - r1) * blend)},${Math.round(g1 + (g2 - g1) * blend)},${Math.round(b1 + (b2 - b1) * blend)})`;
    } else {
      const blend = (t - 0.5) * 2;
      const r1 = parseInt(palette.secondary.slice(1, 3), 16);
      const g1 = parseInt(palette.secondary.slice(3, 5), 16);
      const b1 = parseInt(palette.secondary.slice(5, 7), 16);
      const r2 = parseInt(palette.tertiary.slice(1, 3), 16);
      const g2 = parseInt(palette.tertiary.slice(3, 5), 16);
      const b2 = parseInt(palette.tertiary.slice(5, 7), 16);
      color = `rgb(${Math.round(r1 + (r2 - r1) * blend)},${Math.round(g1 + (g2 - g1) * blend)},${Math.round(b1 + (b2 - b1) * blend)})`;
    }

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + normalized * 2;
    ctx.lineCap = 'round';

    if (normalized > 0.4) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 6 + normalized * 10;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Inner circle with radial gradient
  const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  innerGrad.addColorStop(0, rgbToRgba(palette.secondary, 0.15));
  innerGrad.addColorStop(0.7, rgbToRgba(palette.primary, 0.08));
  innerGrad.addColorStop(1, rgbToRgba(palette.primary, 0.25));
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Rotating inner ring
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.3);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r1 = radius * 0.7;
    const r2 = radius * 0.85;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.strokeStyle = rgbToRgba(palette.tertiary, 0.3);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();

  // Center dot pulse
  const pulseSize = 6 + bassEnergy * 20;
  const dotGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseSize);
  dotGrad.addColorStop(0, palette.tertiary);
  dotGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = dotGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, pulseSize, 0, Math.PI * 2);
  ctx.fill();
}
