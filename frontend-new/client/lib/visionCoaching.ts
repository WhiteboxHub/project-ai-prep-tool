import type { VisionResults } from "@/lib/huggingFaceVision";

export interface CoachingState {
  isPerfect: boolean;
  message: string | null;
  issues: {
    noFace: boolean;
    multipleFaces: boolean;
    notCentered: boolean;
    tooClose: boolean;
    tooFar: boolean;
    lookingAway: boolean;
    edgeCropped: boolean;
  };
}

// Moderate thresholds so coaching is actually visible when user moves slightly
const CENTER_X_MIN = 0.35;
const CENTER_X_MAX = 0.65;
const CENTER_Y_MIN = 0.25;
const CENTER_Y_MAX = 0.60;
const AREA_MIN = 0.04; // 4% of screen
const AREA_MAX = 0.35; // 35% of screen

export function getVisionCoaching(
  results: VisionResults,
  videoWidth: number,
  videoHeight: number
): CoachingState {
  const issues = {
    noFace: false,
    multipleFaces: false,
    notCentered: false,
    tooClose: false,
    tooFar: false,
    lookingAway: false,
    edgeCropped: false,
    notHappy: false,
  };

  if (!results || results.status !== "tracking") {
    return { isPerfect: false, message: "Initializing camera...", issues };
  }

  if (results.faces.length === 0) {
    issues.noFace = true;
    return { isPerfect: false, message: "We couldn't detect your face.", issues };
  }

  if (results.faces.length > 1) {
    issues.multipleFaces = true;
    return { isPerfect: false, message: "Only one person should be visible.", issues };
  }

  const face = results.faces[0];
  const { bounds, eye } = face;

  const vw = videoWidth || 640;
  const vh = videoHeight || 480;

  // Edge cropped
  if (
    bounds.x < -10 ||
    bounds.y < -10 ||
    bounds.x + bounds.width > vw + 10 ||
    bounds.y + bounds.height > vh + 10
  ) {
    issues.edgeCropped = true;
    return { isPerfect: false, message: "Please center your entire face in the frame.", issues };
  }

  // Size constraints
  const faceArea = bounds.width * bounds.height;
  const videoArea = vw * vh;
  const areaRatio = faceArea / videoArea;

  if (areaRatio < AREA_MIN) {
    issues.tooFar = true;
    return { isPerfect: false, message: "Move a little closer.", issues };
  }

  if (areaRatio > AREA_MAX) {
    issues.tooClose = true;
    return { isPerfect: false, message: "Move slightly away.", issues };
  }

  // Centering constraints
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const nx = cx / vw;
  const ny = cy / vh;

  if (nx < CENTER_X_MIN) {
    issues.notCentered = true;
    return { isPerfect: false, message: "Move slightly right.", issues };
  }
  if (nx > CENTER_X_MAX) {
    issues.notCentered = true;
    return { isPerfect: false, message: "Move slightly left.", issues };
  }
  if (ny < CENTER_Y_MIN) {
    issues.notCentered = true;
    return { isPerfect: false, message: "Move down a little.", issues };
  }
  if (ny > CENTER_Y_MAX) {
    issues.notCentered = true;
    return { isPerfect: false, message: "Move up a little.", issues };
  }

  // Eye gaze constraints
  if (eye && eye.lookingAway) {
    issues.lookingAway = true;
    if (face.emotion !== "happy") {
      issues.notHappy = true;
    }
    return { isPerfect: false, message: "Please look toward the camera", issues };
  }

  return { isPerfect: true, message: null, issues };
}
