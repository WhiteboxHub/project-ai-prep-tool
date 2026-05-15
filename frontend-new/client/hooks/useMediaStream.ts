import { useState, useEffect } from "react";

export function useMediaStream(requestOnMount = true) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const [audioError, setAudioError] = useState<string>("");
  const [videoError, setVideoError] = useState<string>("");
  
  const [audioState, setAudioState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [videoState, setVideoState] = useState<"prompt" | "granted" | "denied">("prompt");

  const updateStream = (newTrack: MediaStreamTrack) => {
    setStream((prev) => {
      const newStream = prev ? new MediaStream(prev.getTracks()) : new MediaStream();
      // Remove old track of the same kind if exists
      newStream.getTracks().forEach((t) => {
        if (t.kind === newTrack.kind) {
          t.stop();
          newStream.removeTrack(t);
        }
      });
      newStream.addTrack(newTrack);
      return newStream;
    });
  };

  const requestAudio = async () => {
    setAudioError("");
    setAudioState("prompt");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      updateStream(media.getAudioTracks()[0]);
      setAudioState("granted");
    } catch (err: any) {
      console.error("Audio permission error:", err);
      setAudioState("denied");
      setAudioError(err.name === "NotAllowedError" ? "Microphone access denied." : "No microphone found.");
    }
  };

  const requestVideo = async () => {
    setVideoError("");
    setVideoState("prompt");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true });
      updateStream(media.getVideoTracks()[0]);
      setVideoState("granted");
    } catch (err: any) {
      console.error("Video permission error:", err);
      setVideoState("denied");
      setVideoError(err.name === "NotAllowedError" ? "Camera access denied." : "No camera found.");
    }
  };

  const requestMedia = async () => {
    await Promise.allSettled([requestAudio(), requestVideo()]);
  };

  const stopMedia = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setAudioState("prompt");
    setVideoState("prompt");
  };

  useEffect(() => {
    if (requestOnMount) {
      requestMedia();
    }
    return () => stopMedia();
  }, [requestOnMount]);

  const toggleVideo = (enabled: boolean) => {
    if (stream) {
      stream.getVideoTracks().forEach((track) => { track.enabled = enabled; });
    }
  };

  const toggleAudio = (enabled: boolean) => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => { track.enabled = enabled; });
    }
  };

  return {
    stream,
    audioError,
    videoError,
    audioState,
    videoState,
    requestMedia,
    requestAudio,
    requestVideo,
    stopMedia,
    toggleVideo,
    toggleAudio,
  };
}
