import type { ColorScheme } from '../types';
import { COLOR_PALETTES, rgbToRgba } from '../utils/colors';

export function renderBars(
  ctx: CanvasRenderingContext2D,
  frequencyData: Uint8Array,
  width: number,
  height: number,
  sensitivity: number,
  colorScheme: ColorScheme,
  isBeat: boolean,
  bassEnergy: number
) {
  const palette = COLOR_PALETTES[colorScheme];
  const barCount = 120;
  const step = Math.floor(frequencyData.length / barCount);
  const gap = 2;
  const barW = (width - gap * (barCount - 1)) / barCount;

  // Background with slight pulse on beat
  ctx.fillStyle = '#07060F';
  ctx.fillRect(0, 0, width, height);

  // Beat edge glow
  if (isBeat && bassEnergy > 0.15) {
    const glowSize = 40 + bassEnergy * 80;
    const edgeGrad = ctx.createRadialGradient(
      width / 2, height, 0,
      width / 2, height, glowSize * 3
    );
    edgeGrad.addColorStop(0, rgbToRgba(palette.primary, 0.25 * bassEnergy));
    edgeGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, width, height);
  }

  for (let i = 0; i < barCount; i++) {
    // Average nearby frequency bins for smoother look
    let sum = 0;
    for (let j = 0; j < step; j++) {
      sum += frequencyData[i * step + j] || 0;
    }
    const raw = sum / step / 255;
    const normalized = Math.min(1, raw * sensitivity * 1.5);
    const barH = normalized * height * 0.85;

    const x = i * (barW + gap);
    const y = height - barH;

    // Main gradient bar
    const grad = ctx.createLinearGradient(x, height, x, y);
    grad.addColorStop(0, palette.primary);
    grad.addColorStop(0.5, palette.secondary);
    grad.addColorStop(1, palette.tertiary);
    ctx.fillStyle = grad;

    // Rounded top
    ctx.beginPath();
    const radius = Math.min(barW / 2, 3);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + barW - radius, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
    ctx.lineTo(x + barW, height);
    ctx.lineTo(x, height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    // Glow on taller bars
    if (normalized > 0.3) {
      ctx.shadowColor = palette.primary;
      ctx.shadowBlur = 8 + normalized * 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Mirror reflection
    ctx.globalAlpha = 0.15;
    const reflectGrad = ctx.createLinearGradient(x, height, x, height + barH * 0.3);
    reflectGrad.addColorStop(0, palette.primary);
    reflectGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = reflectGrad;
    ctx.fillRect(x, height, barW, barH * 0.3);
    ctx.globalAlpha = 1;
  }

  // Center frequency line
  const lineGrad = ctx.createLinearGradient(0, height - 1, width, height - 1);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.5, palette.primary);
  lineGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(width, height);
  ctx.stroke();
}
