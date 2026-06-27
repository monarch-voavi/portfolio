import type { ColorScheme } from '../types';
import { COLOR_PALETTES, rgbToRgba } from '../utils/colors';

export function renderWaveform(
  ctx: CanvasRenderingContext2D,
  timeData: Uint8Array,
  frequencyData: Uint8Array,
  width: number,
  height: number,
  sensitivity: number,
  colorScheme: ColorScheme,
  isBeat: boolean,
  bassEnergy: number
) {
  const palette = COLOR_PALETTES[colorScheme];

  ctx.fillStyle = '#07060F';
  ctx.fillRect(0, 0, width, height);

  const cy = height / 2;
  const sliceWidth = width / timeData.length;

  // Background glow strip on beat
  if (isBeat) {
    const stripGrad = ctx.createLinearGradient(0, cy - 80, 0, cy + 80);
    stripGrad.addColorStop(0, 'transparent');
    stripGrad.addColorStop(0.5, rgbToRgba(palette.primary, 0.06 * bassEnergy * 4));
    stripGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = stripGrad;
    ctx.fillRect(0, cy - 80, width, 160);
  }

  // Grid lines
  ctx.strokeStyle = rgbToRgba(palette.primary, 0.06);
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const y = (i / 7) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw main waveform
  const drawWave = (alpha: number, yOffset: number, thicknessMulti: number) => {
    ctx.beginPath();
    let x = 0;

    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] / 128.0 - 1.0) * sensitivity;
      const y = cy + yOffset + v * (height * 0.35);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        // Smooth curve
        const prevX = (i - 1) * sliceWidth;
        const prevV = (timeData[i - 1] / 128.0 - 1.0) * sensitivity;
        const prevY = cy + yOffset + prevV * (height * 0.35);
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
      }
      x += sliceWidth;
    }

    // Gradient stroke
    const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
    lineGrad.addColorStop(0, rgbToRgba(palette.primary, alpha * 0.5));
    lineGrad.addColorStop(0.25, rgbToRgba(palette.primary, alpha));
    lineGrad.addColorStop(0.5, rgbToRgba(palette.secondary, alpha));
    lineGrad.addColorStop(0.75, rgbToRgba(palette.tertiary, alpha));
    lineGrad.addColorStop(1, rgbToRgba(palette.tertiary, alpha * 0.5));

    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2 * thicknessMulti;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (alpha === 1) {
      ctx.shadowColor = palette.primary;
      ctx.shadowBlur = 12;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  // Draw ghost trails (thinner, offset)
  drawWave(0.15, -3, 0.6);
  drawWave(0.15, 3, 0.6);
  // Main wave
  drawWave(1, 0, 1.5);

  // Fill under the wave
  ctx.beginPath();
  let x = 0;
  ctx.moveTo(0, cy);
  for (let i = 0; i < timeData.length; i++) {
    const v = (timeData[i] / 128.0 - 1.0) * sensitivity;
    const y = cy + v * (height * 0.35);
    ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.lineTo(width, cy);
  ctx.closePath();

  const fillGrad = ctx.createLinearGradient(0, cy - height * 0.35, 0, cy + height * 0.35);
  fillGrad.addColorStop(0, rgbToRgba(palette.tertiary, 0.07));
  fillGrad.addColorStop(0.5, rgbToRgba(palette.secondary, 0.04));
  fillGrad.addColorStop(1, rgbToRgba(palette.primary, 0.07));
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // Frequency spectrum mini-bar at bottom
  const specH = 40;
  const specBars = 60;
  const specStep = Math.floor(frequencyData.length / specBars);
  const specBarW = width / specBars;

  for (let i = 0; i < specBars; i++) {
    let sum = 0;
    for (let j = 0; j < specStep; j++) sum += frequencyData[i * specStep + j] || 0;
    const norm = (sum / specStep / 255) * sensitivity;
    const bh = Math.min(norm * specH * 1.5, specH);
    ctx.fillStyle = rgbToRgba(palette.secondary, 0.5);
    ctx.fillRect(i * specBarW + 1, height - bh, specBarW - 2, bh);
  }
}
