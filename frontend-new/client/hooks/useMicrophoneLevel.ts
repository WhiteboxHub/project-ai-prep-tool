import { useState, useEffect } from "react";

// ─── Module-level Singletons ──────────────────────────────────────────────────
// These ensure we only ever create one AudioContext and AnalyserNode for the entire app,
// preventing audio lock issues across sequential screens (Permission -> Device Check -> Recording).
let sharedAudioContext: AudioContext | null = null;
let sharedAnalyser: AnalyserNode | null = null;
let sharedSource: MediaStreamAudioSourceNode | null = null;
let currentStreamId: string | null = null;

export function useMicrophoneLevel(stream: MediaStream | null) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      setLevel(0);
      return;
    }

    try {
      if (!sharedAudioContext || sharedAudioContext.state === "closed") {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        sharedAudioContext = new AudioContextClass();
        sharedAnalyser = sharedAudioContext.createAnalyser();
        sharedAnalyser.fftSize = 256;
        sharedAnalyser.smoothingTimeConstant = 0.5; // lower smoothing for faster reaction
      }

      // If the stream changed, disconnect the old source and connect the new one
      if (currentStreamId !== stream.id && sharedAudioContext && sharedAnalyser) {
        if (sharedSource) {
          sharedSource.disconnect();
        }
        sharedSource = sharedAudioContext.createMediaStreamSource(stream);
        sharedSource.connect(sharedAnalyser);
        currentStreamId = stream.id;
      }

      const analyser = sharedAnalyser;
      if (!analyser) return;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let animationFrame: number;

      const update = () => {
        analyser.getByteTimeDomainData(dataArray);
        
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128; // -1 to 1
          sumSquares += normalized * normalized;
        }
        
        const rms = Math.sqrt(sumSquares / dataArray.length);
        
        // Map RMS (0 to ~0.5) to a 0-100 percentage with a logarithmic/exponential curve for better visual feel
        // Usually RMS of human voice peaks around 0.3 - 0.5
        let visualLevel = rms * 400; // magic multiplier for visuals
        
        // Add a slight curve to make it feel more dynamic
        visualLevel = Math.pow(visualLevel / 100, 0.8) * 100;
        visualLevel = Math.min(100, Math.max(0, visualLevel));

        setLevel(visualLevel);

        animationFrame = requestAnimationFrame(update);
      };

      update();

      return () => {
        cancelAnimationFrame(animationFrame);
        // Do NOT disconnect the shared analyser! It will be reused across screens.
      };
    } catch (err) {
      console.error("Error with audio analyser:", err);
    }
  }, [stream]);

  return level;
}
