import { useState, useEffect, useRef } from "react";

/**
 * Hook to analyze a MediaStream and return real-time volume levels.
 * Returns an array of normalized values (0 to 1) suitable for animating visualizer bars.
 */
export function useAudioVisualizer(stream: MediaStream | null, numBars: number = 7) {
  const [levels, setLevels] = useState<number[]>(new Array(numBars).fill(0.1));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      setLevels(new Array(numBars).fill(0.1));
      return;
    }

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const update = () => {
        analyser.getByteFrequencyData(dataArray);

        // We only care about the lower half of the frequencies for voice
        const sliceSize = Math.floor(bufferLength / 2 / numBars);
        const newLevels = [];

        for (let i = 0; i < numBars; i++) {
          let sum = 0;
          for (let j = 0; j < sliceSize; j++) {
            sum += dataArray[i * sliceSize + j];
          }
          let avg = sum / sliceSize;
          
          // Normalize (0-255 to 0.1-1.0)
          let normalized = (avg / 255);
          
          // Add a base height of 0.1, max out at 1.0
          normalized = Math.max(0.1, Math.min(1.0, normalized));
          
          // Apply a slight curve to make it more visually dynamic
          normalized = Math.pow(normalized, 1.5);
          // Re-ensure base minimum after curve
          normalized = Math.max(0.1, normalized);

          newLevels.push(normalized);
        }

        setLevels(newLevels);
        animationFrameRef.current = requestAnimationFrame(update);
      };

      update();
    } catch (err) {
      console.error("Error initializing audio visualizer:", err);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stream, numBars]);

  return levels;
}
