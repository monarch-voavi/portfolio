export type VisualizerMode = 'bars' | 'circular' | 'waveform' | 'particles';

export type ColorScheme = 'neon-purple' | 'matrix-green' | 'sunset-pink' | 'monochrome';

export interface ColorPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  glow: string;
}

export interface DemoTrack {
  id: string;
  name: string;
  artist: string;
  url: string;
  duration: number;
}

export interface AudioState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  trackName: string;
  artist: string;
  source: 'file' | 'microphone' | 'demo' | null;
  demoTrackId: string | null;
}

export interface VisualizerState {
  mode: VisualizerMode;
  colorScheme: ColorScheme;
  sensitivity: number;
  showFPS: boolean;
  isFullscreen: boolean;
}

export interface BeatDetection {
  isBeat: boolean;
  bassEnergy: number;
  midEnergy: number;
  trebleEnergy: number;
  overallEnergy: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  hue: number;
}
