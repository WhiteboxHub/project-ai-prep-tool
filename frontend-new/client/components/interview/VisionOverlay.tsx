import React, { useEffect, useRef } from "react";
import { Eye, ScanFace } from "lucide-react";
import type { VisionResults } from "@/lib/huggingFaceVision";

interface VisionOverlayProps {
  results: VisionResults;
  status: string;
  error?: string;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const FACE_LOOKING = "#22c55e";
const FACE_WARNING = "#ff3045";
const OBJECT_COLOR = "#edf45f";

export function VisionOverlay({ results, status, error, videoRef }: VisionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = video.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (status !== "tracking") return;

    const viewport = getObjectCoverViewport(video.videoWidth, video.videoHeight, rect.width, rect.height);
    
    // Make the box thicker as requested
    ctx.lineWidth = 4;
    ctx.font = "bold 14px system-ui";
    ctx.textBaseline = "bottom";

    // ONLY draw face tracking boxes, NOT object boxes
    results.faces.forEach(({ bounds, eye }) => {
      const paddingX = bounds.width * 0.2;
      const paddingY = bounds.height * 0.25;
      const box = mapVideoBox(
        {
          x: Math.max(bounds.x - paddingX, 0),
          y: Math.max(bounds.y - paddingY, 0),
          width: bounds.width + paddingX * 2,
          height: bounds.height + paddingY * 2,
        },
        viewport,
      );
      const isLookingAtScreen = eye && !eye.lookingAway;
      
      ctx.shadowColor = isLookingAtScreen ? 'rgba(34,197,94,0.4)' : 'rgba(255,48,69,0.4)';
      ctx.shadowBlur = 15;
      
      drawBox(
        ctx, 
        box, 
        isLookingAtScreen ? FACE_LOOKING : FACE_WARNING, 
        isLookingAtScreen ? "CENTERED" : "PLEASE LOOK INTO THE CAMERA"
      );
      
      ctx.shadowBlur = 0; // reset
    });
  }, [results, status, videoRef]);

  const primaryEye = results.faces[0]?.eye;
  const faceCount = results.faces.length;
  const objectCount = results.objects.length;

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 z-10 h-full w-full pointer-events-none" />
      <div className="absolute left-4 bottom-14 z-20 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2">
        <div className="glass-card flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-foreground">
          <ScanFace className="h-3.5 w-3.5 text-primary" />
          <span>{status === "loading" ? "Loading vision" : `${faceCount} face${faceCount === 1 ? "" : "s"}`}</span>
        </div>
        {status === "tracking" && (
          <div className="glass-card flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-foreground">
            <Eye className="h-3.5 w-3.5 text-primary" />
            <span>{primaryEye?.calibrated ? primaryEye.direction : "calibrating"}</span>
          </div>
        )}
        {status === "unavailable" && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
            Vision unavailable{error ? `: ${error}` : ""}
          </div>
        )}
      </div>
    </>
  );
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  color: string,
  label?: string,
) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  if (!label) return;
  const labelY = Math.max(14, box.y - 5);
  ctx.fillText(label, box.x, labelY);
}

function getObjectCoverViewport(videoWidth: number, videoHeight: number, containerWidth: number, containerHeight: number) {
  const safeVideoWidth = videoWidth || containerWidth || 1;
  const safeVideoHeight = videoHeight || containerHeight || 1;
  const scale = Math.max(containerWidth / safeVideoWidth, containerHeight / safeVideoHeight);
  const renderedWidth = safeVideoWidth * scale;
  const renderedHeight = safeVideoHeight * scale;

  return {
    scale,
    offsetX: (containerWidth - renderedWidth) / 2,
    offsetY: (containerHeight - renderedHeight) / 2,
  };
}

function mapVideoBox(
  box: { x: number; y: number; width: number; height: number },
  viewport: { scale: number; offsetX: number; offsetY: number },
) {
  return {
    x: box.x * viewport.scale + viewport.offsetX,
    y: box.y * viewport.scale + viewport.offsetY,
    width: box.width * viewport.scale,
    height: box.height * viewport.scale,
  };
}

function formatScore(score = 0) {
  return `${Math.round(score * 100)}%`;
}
