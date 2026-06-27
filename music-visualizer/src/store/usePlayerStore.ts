import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VisualizerMode, ColorScheme } from '../types';

interface PlayerStore {
  // Audio state
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  trackName: string;
  artist: string;
  source: 'file' | 'microphone' | 'demo' | null;
  demoTrackId: string | null;

  // Visualizer state
  mode: VisualizerMode;
  colorScheme: ColorScheme;
  sensitivity: number;
  showFPS: boolean;
  isFullscreen: boolean;

  // Beat state (transient, not persisted)
  bassEnergy: number;
  midEnergy: number;
  trebleEnergy: number;
  isBeat: boolean;

  // Actions
  setIsPlaying: (v: boolean) => void;
  setIsMuted: (v: boolean) => void;
  setVolume: (v: number) => void;
  setCurrentTime: (v: number) => void;
  setDuration: (v: number) => void;
  setTrackName: (name: string, artist?: string) => void;
  setSource: (source: 'file' | 'microphone' | 'demo' | null) => void;
  setDemoTrackId: (id: string | null) => void;

  setMode: (mode: VisualizerMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setSensitivity: (v: number) => void;
  setShowFPS: (v: boolean) => void;
  setIsFullscreen: (v: boolean) => void;

  setBeatData: (bass: number, mid: number, treble: number, isBeat: boolean) => void;
}

const PERSISTED_KEYS = ['mode', 'colorScheme', 'sensitivity', 'showFPS', 'volume'];

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      isPlaying: false,
      isMuted: false,
      volume: 0.8,
      currentTime: 0,
      duration: 0,
      trackName: 'No Track',
      artist: '',
      source: null,
      demoTrackId: null,

      mode: 'bars',
      colorScheme: 'neon-purple',
      sensitivity: 1.0,
      showFPS: false,
      isFullscreen: false,

      bassEnergy: 0,
      midEnergy: 0,
      trebleEnergy: 0,
      isBeat: false,

      setIsPlaying: (v) => set({ isPlaying: v }),
      setIsMuted: (v) => set({ isMuted: v }),
      setVolume: (v) => set({ volume: v }),
      setCurrentTime: (v) => set({ currentTime: v }),
      setDuration: (v) => set({ duration: v }),
      setTrackName: (name, artist = '') => set({ trackName: name, artist }),
      setSource: (source) => set({ source }),
      setDemoTrackId: (id) => set({ demoTrackId: id }),

      setMode: (mode) => set({ mode }),
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setSensitivity: (sensitivity) => set({ sensitivity }),
      setShowFPS: (v) => set({ showFPS: v }),
      setIsFullscreen: (v) => set({ isFullscreen: v }),

      setBeatData: (bass, mid, treble, isBeat) =>
        set({ bassEnergy: bass, midEnergy: mid, trebleEnergy: treble, isBeat }),
    }),
    {
      name: 'music-visualizer-prefs',
      partialize: (state) =>
        Object.fromEntries(
          PERSISTED_KEYS.map((k) => [k, state[k as keyof PlayerStore]])
        ) as Partial<PlayerStore>,
    }
  )
);
