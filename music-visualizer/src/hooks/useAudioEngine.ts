import { useRef, useCallback, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';

const FFT_SIZE = 2048;
const SMOOTHING = 0.82;

// Beat detection constants
const BASS_RANGE = [0, 10];
const MID_RANGE = [10, 80];
const TREBLE_RANGE = [80, 200];
const BEAT_THRESHOLD = 1.4;
const BEAT_HOLD_MS = 80;

interface AudioEngine {
  audioCtx: AudioContext | null;
  analyser: AnalyserNode | null;
  gainNode: GainNode | null;
  source: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null;
  micStream: MediaStream | null;
  frequencyData: Uint8Array;
  timeData: Uint8Array;
}

export function useAudioEngine(audioElRef: React.RefObject<HTMLAudioElement | null>) {
  const engineRef = useRef<AudioEngine>({
    audioCtx: null,
    analyser: null,
    gainNode: null,
    source: null,
    micStream: null,
    frequencyData: new Uint8Array(FFT_SIZE / 2),
    timeData: new Uint8Array(FFT_SIZE),
  });

  const beatHistoryRef = useRef<number[]>(new Array(43).fill(0));
  const lastBeatTimeRef = useRef<number>(0);

  const store = usePlayerStore();

  const ensureContext = useCallback(() => {
    if (!engineRef.current.audioCtx) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING;

      const gain = ctx.createGain();
      gain.gain.value = store.isMuted ? 0 : store.volume;

      analyser.connect(gain);
      gain.connect(ctx.destination);

      engineRef.current.audioCtx = ctx;
      engineRef.current.analyser = analyser;
      engineRef.current.gainNode = gain;
      engineRef.current.frequencyData = new Uint8Array(analyser.frequencyBinCount);
      engineRef.current.timeData = new Uint8Array(analyser.fftSize);
    }
    return engineRef.current;
  }, [store.isMuted, store.volume]);

  const connectAudioElement = useCallback(() => {
    const el = audioElRef.current;
    if (!el) return;

    const eng = ensureContext();
    if (!eng.audioCtx || !eng.analyser) return;

    // Disconnect existing source
    if (eng.source) {
      try { eng.source.disconnect(); } catch {}
      eng.source = null;
    }
    if (eng.micStream) {
      eng.micStream.getTracks().forEach(t => t.stop());
      eng.micStream = null;
    }

    const mediaSource = eng.audioCtx.createMediaElementSource(el);
    mediaSource.connect(eng.analyser);
    eng.source = mediaSource;
  }, [audioElRef, ensureContext]);

  const connectMicrophone = useCallback(async () => {
    const eng = ensureContext();
    if (!eng.audioCtx || !eng.analyser) return false;

    // Disconnect existing
    if (eng.source) {
      try { eng.source.disconnect(); } catch {}
      eng.source = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      eng.micStream = stream;
      const micSource = eng.audioCtx.createMediaStreamSource(stream);
      micSource.connect(eng.analyser);
      eng.source = micSource;
      return true;
    } catch (e) {
      console.error('Microphone access denied:', e);
      return false;
    }
  }, [ensureContext]);

  const disconnectMicrophone = useCallback(() => {
    const eng = engineRef.current;
    if (eng.micStream) {
      eng.micStream.getTracks().forEach(t => t.stop());
      eng.micStream = null;
    }
    if (eng.source) {
      try { eng.source.disconnect(); } catch {}
      eng.source = null;
    }
  }, []);

  const getAnalysisData = useCallback(() => {
    const eng = engineRef.current;
    if (!eng.analyser) return null;

    eng.analyser.getByteFrequencyData(eng.frequencyData);
    eng.analyser.getByteTimeDomainData(eng.timeData);

    const freq = eng.frequencyData;

    // Compute band energies
    const average = (start: number, end: number) => {
      let sum = 0;
      for (let i = start; i < end; i++) sum += freq[i];
      return sum / (end - start) / 255;
    };

    const bass = average(...BASS_RANGE as [number, number]);
    const mid = average(...MID_RANGE as [number, number]);
    const treble = average(...TREBLE_RANGE as [number, number]);
    const overall = (bass * 0.5 + mid * 0.3 + treble * 0.2);

    // Beat detection via spectral flux on bass
    const history = beatHistoryRef.current;
    history.shift();
    history.push(bass);
    const avgBass = history.reduce((a, b) => a + b, 0) / history.length;
    const now = performance.now();
    const isBeat =
      bass > avgBass * BEAT_THRESHOLD &&
      bass > 0.1 &&
      now - lastBeatTimeRef.current > BEAT_HOLD_MS;

    if (isBeat) lastBeatTimeRef.current = now;

    return { frequencyData: freq, timeData: eng.timeData, bass, mid, treble, overall, isBeat };
  }, []);

  const resumeContext = useCallback(() => {
    const ctx = engineRef.current.audioCtx;
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }, []);

  // Sync volume
  useEffect(() => {
    const gain = engineRef.current.gainNode;
    if (gain) {
      gain.gain.value = store.isMuted ? 0 : store.volume;
    }
  }, [store.volume, store.isMuted]);

  // Cleanup
  useEffect(() => {
    return () => {
      const eng = engineRef.current;
      if (eng.micStream) eng.micStream.getTracks().forEach(t => t.stop());
      if (eng.audioCtx) eng.audioCtx.close();
    };
  }, []);

  return {
    engineRef,
    connectAudioElement,
    connectMicrophone,
    disconnectMicrophone,
    getAnalysisData,
    resumeContext,
  };
}
