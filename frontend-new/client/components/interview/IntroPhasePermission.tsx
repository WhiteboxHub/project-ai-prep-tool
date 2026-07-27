import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Mic, AlertCircle, RefreshCw, ShieldCheck, ArrowRight } from "lucide-react";
import { VoiceVerification } from "./VoiceVerification";

interface IntroPhasePermissionProps {
  onGranted: () => void;
  requestAudio: () => Promise<void> | void;
  requestVideo: () => Promise<void> | void;
  audioState: string;
  videoState: string;
  isAudioOnly: boolean;
  stream: MediaStream | null;
  isCandidateSpeaking: boolean;
}

export function IntroPhasePermission({
  onGranted,
  requestAudio,
  requestVideo,
  audioState,
  videoState,
  isAudioOnly,
  stream,
  isCandidateSpeaking,
}: IntroPhasePermissionProps) {
  const [requesting, setRequesting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const isDenied =
    audioState === "denied" || (!isAudioOnly && videoState === "denied");

  const handleAllow = async () => {
    setRequesting(true);
    setAttempted(true);
    try {
      await requestAudio();
      if (!isAudioOnly) await requestVideo();
    } finally {
      setRequesting(false);
    }
  };

  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [voiceVerified, setVoiceVerified] = useState(false);

  // Instead of auto-advancing, we move to the voice verification state
  React.useEffect(() => {
    const audioOk = audioState === "granted";
    const videoOk = isAudioOnly || videoState === "granted";
    if (audioOk && videoOk && attempted) {
      setPermissionsGranted(true);
    }
  }, [audioState, videoState, attempted, isAudioOnly]);

  const reasons = isAudioOnly
    ? [
        {
          icon: Mic,
          color: "text-emerald-400",
          bg: "bg-emerald-400/10 border-emerald-400/20",
          title: "Microphone",
          desc: "We listen to your introduction so the AI can evaluate your speech.",
        },
      ]
    : [
        {
          icon: Camera,
          color: "text-blue-400",
          bg: "bg-blue-400/10 border-blue-400/20",
          title: "Camera",
          desc: "We watch your body language and eye contact to give you camera presence feedback.",
        },
        {
          icon: Mic,
          color: "text-emerald-400",
          bg: "bg-emerald-400/10 border-emerald-400/20",
          title: "Microphone",
          desc: "We listen to your introduction so the AI can evaluate your speech and fluency.",
        },
      ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-card/30 to-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full space-y-8"
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {isAudioOnly ? "We need your microphone" : "We need your camera and microphone"}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your recordings are only used to generate interview feedback. Nothing is shared or stored publicly.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!permissionsGranted ? (
            <motion.div
              key="request"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Reason cards */}
              <div className="space-y-3">
                {reasons.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-4 p-4 rounded-2xl border ${item.bg}`}
                    >
                      <div className={`p-2.5 rounded-xl bg-background/50 flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{item.title}</p>
                        <p className="text-muted-foreground text-xs leading-relaxed mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Denied state */}
              <AnimatePresence>
                {isDenied && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-3">
                        <p className="font-bold text-amber-500 text-sm">
                          {isAudioOnly ? "Microphone access is blocked" : "Camera or microphone access is blocked"}
                        </p>
                        <div className="text-amber-500/80 text-xs leading-relaxed space-y-2">
                          <p>It looks like your browser is blocking access to your {isAudioOnly ? "microphone" : "devices"}. To fix this and continue:</p>
                          <ol className="list-decimal pl-4 space-y-1 font-medium text-amber-500/90">
                            <li>Click the 🔒 lock or {isAudioOnly ? "microphone" : "camera"} icon in your browser's address bar (at the top of the screen).</li>
                            <li>Find the <strong>{isAudioOnly ? "Microphone" : "Camera and Microphone"}</strong> setting and change it to <strong>Allow</strong>.</li>
                            <li>Click <strong>Try Again</strong> below.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CTA */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleAllow}
                  disabled={requesting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:scale-100 disabled:cursor-wait flex items-center justify-center gap-2"
                >
                  {requesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Waiting for permission...
                    </>
                  ) : isDenied ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </>
                  ) : (
                    isAudioOnly ? "Allow Microphone" : "Allow Camera & Microphone"
                  )}
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Your browser will ask you to confirm — click "Allow" to continue.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <VoiceVerification 
                stream={stream}
                isSpeaking={isCandidateSpeaking}
                onVerified={() => setVoiceVerified(true)}
              />
              
              <button
                onClick={onGranted}
                disabled={!voiceVerified}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
