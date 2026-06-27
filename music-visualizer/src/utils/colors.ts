import type { ColorScheme, ColorPalette } from '../types';

export const COLOR_PALETTES: Record<ColorScheme, ColorPalette> = {
  'neon-purple': {
    primary: '#7B3FEF',
    secondary: '#FF8EC8',
    tertiary: '#00FFA3',
    glow: 'rgba(123, 63, 239, 0.6)',
  },
  'matrix-green': {
    primary: '#00FFA3',
    secondary: '#00CC80',
    tertiary: '#80FFD4',
    glow: 'rgba(0, 255, 163, 0.6)',
  },
  'sunset-pink': {
    primary: '#FF8EC8',
    secondary: '#FF4F8B',
    tertiary: '#FFD166',
    glow: 'rgba(255, 142, 200, 0.6)',
  },
  monochrome: {
    primary: '#E8E4FF',
    secondary: '#9B97CC',
    tertiary: '#4A4670',
    glow: 'rgba(232, 228, 255, 0.4)',
  },
};

export function getGradientColors(scheme: ColorScheme): [string, string, string] {
  const p = COLOR_PALETTES[scheme];
  return [p.primary, p.secondary, p.tertiary];
}

export function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function rgbToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function createBarGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  scheme: ColorScheme
): CanvasGradient {
  const [c1, c2, c3] = getGradientColors(scheme);
  const grad = ctx.createLinearGradient(x, y + height, x, y);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.5, c2);
  grad.addColorStop(1, c3);
  return grad;
}

export function createRadialGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  scheme: ColorScheme
): CanvasGradient {
  const [c1, c2] = getGradientColors(scheme);
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, c2);
  grad.addColorStop(1, c1);
  return grad;
}
