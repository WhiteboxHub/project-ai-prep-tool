const MEDIAPIPE_VERSION = "0.10.21";
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const MEDIAPIPE_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MEDIAPIPE_ESM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/+esm`;
const COCO_SSD_ESM_URL = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/+esm";
const TFJS_ESM_URL = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/+esm";

const LEFT_EYE = [33, 133, 159, 145];
const RIGHT_EYE = [362, 263, 386, 374];
const LEFT_IRIS = [468, 469, 470, 471, 472];
const RIGHT_IRIS = [473, 474, 475, 476, 477];
const HORIZONTAL_GAZE_THRESHOLD = 0.45;
const VERTICAL_GAZE_THRESHOLD = 0.45;
const BLENDSHAPE_SIDE_THRESHOLD = 0.65;
const BLENDSHAPE_VERTICAL_THRESHOLD = 0.65;
const CALIBRATION_SAMPLE_COUNT = 30;

export type VisionStatus = "idle" | "loading" | "tracking" | "unavailable" | "stopped";

export interface VisionObjectDetection {
  bbox: [number, number, number, number];
  class?: string;
  label?: string;
  score: number;
}

export interface VisionEyeEstimate {
  horizontal: number;
  vertical: number;
  direction: string;
  lookingAway: boolean;
  confidence: number | null;
  calibrated: boolean;
}

export type VisionEmotion = "happy" | "sad" | "angry" | "neutral";

export interface VisionFaceDetection {
  bounds: { x: number; y: number; width: number; height: number };
  eye: VisionEyeEstimate | null;
  emotion: VisionEmotion;
}

export interface VisionResults {
  objects: VisionObjectDetection[];
  faces: VisionFaceDetection[];
  status: VisionStatus;
  error?: string;
  objectError?: string;
}

interface VisionTrackerOptions {
  video: HTMLVideoElement;
  onResults?: (results: VisionResults) => void;
  onStatus?: (status: VisionStatus, error?: string) => void;
  objectIntervalMs?: number;
  modelUrl?: string;
  useDefaultObjectModel?: boolean;
}

type Point = { x: number; y: number; z?: number };

export class HuggingFaceVisionTracker {
  private video: HTMLVideoElement;
  private onResults: (results: VisionResults) => void;
  private onStatus: (status: VisionStatus, error?: string) => void;
  private objectIntervalMs: number;
  private modelUrl: string;
  private useDefaultObjectModel: boolean;
  private faceLandmarker: any = null;
  private objectModel: any = null;
  private tf: any = null;
  private objectModelLoading = false;
  private running = false;
  private rafId = 0;
  private lastObjectRun = 0;
  private lastObjects: VisionObjectDetection[] = [];
  private objectError = "";
  private gazeCalibration: { horizontal: number; vertical: number } | null = null;
  private gazeCalibrationSamples: Array<{ horizontal: number; vertical: number }> = [];

  constructor({
    video,
    onResults = () => {},
    onStatus = () => {},
    objectIntervalMs = 240,
    modelUrl = "",
    useDefaultObjectModel = true,
  }: VisionTrackerOptions) {
    this.video = video;
    this.onResults = onResults;
    this.onStatus = onStatus;
    this.objectIntervalMs = objectIntervalMs;
    this.modelUrl = modelUrl;
    this.useDefaultObjectModel = useDefaultObjectModel;
  }

  async start() {
    if (this.running) return;
    
    // Performance Check: Ensure system has at least a 4-core logical CPU
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      this.setStatus("unavailable", "System hardware (less than 4 CPU cores) does not meet the minimum performance requirements for AI vision tracking.");
      return;
    }

    this.setStatus("loading");
    await this.loadFaceModel();
    this.running = true;
    this.resetGazeCalibration();
    this.setStatus("tracking");
    this.loop();
    this.loadObjectModelInBackground();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.lastObjects = [];
    this.setStatus("stopped");
  }

  private async loadFaceModel() {
    if (!this.faceLandmarker) {
      const { FaceLandmarker, FilesetResolver } = await import(/* @vite-ignore */ MEDIAPIPE_ESM_URL);
      const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      this.faceLandmarker = await createFaceLandmarker(FaceLandmarker, fileset, "GPU").catch(() =>
        createFaceLandmarker(FaceLandmarker, fileset, "CPU"),
      );
    }
  }

  private loadObjectModelInBackground() {
    if (this.objectModel || this.objectModelLoading || (!this.modelUrl && !this.useDefaultObjectModel)) return;

    this.objectModelLoading = true;
    this.loadObjectModel()
      .catch((error) => {
        this.objectModel = null;
        this.objectError = error instanceof Error ? error.message : "Object model could not be loaded.";
      })
      .finally(() => {
        this.objectModelLoading = false;
      });
  }

  private async loadObjectModel() {
    if (this.objectModel) return;

    if (this.modelUrl) {
      this.tf = await loadTensorflow();
      this.objectModel = await this.tf.loadGraphModel(this.modelUrl);
      this.objectModel.isCustomGraphModel = true;
      return;
    }

    if (this.useDefaultObjectModel) {
      this.tf = await loadTensorflow();
      const cocoSsd = await import(/* @vite-ignore */ COCO_SSD_ESM_URL);
      this.objectModel = await cocoSsd.load({ base: "lite_mobilenet_v2" });
    }
  }

  private loop = async () => {
    if (!this.running) return;

    try {
      if (!this.video.videoWidth || !this.video.videoHeight || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        this.rafId = requestAnimationFrame(this.loop);
        return;
      }

      const now = performance.now();
      const faceResults = this.detectFaces(now);
      const faces = faceResults.map(({ landmarks, blendshapes }) => ({
        bounds: getFaceBounds(landmarks, this.video.videoWidth, this.video.videoHeight),
        eye: this.estimateEyeMovement(landmarks, blendshapes),
        emotion: estimateEmotion(blendshapes, landmarks),
      }));

      if (this.objectModel && now - this.lastObjectRun > this.objectIntervalMs) {
        this.lastObjectRun = now;
        try {
          this.lastObjects = await this.detectObjects();
          this.objectError = "";
        } catch (error) {
          this.lastObjects = [];
          this.objectModel = null;
          this.objectError = error instanceof Error ? error.message : "Object detection failed.";
        }
      }

      this.onResults({
        objects: this.lastObjects,
        faces,
        status: "tracking",
        objectError: this.objectError,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vision tracking failed.";
      this.setStatus("unavailable", message);
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private detectFaces(now: number) {
    if (!this.faceLandmarker || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return [];
    const result = this.faceLandmarker.detectForVideo(this.video, now);
    return (result.faceLandmarks ?? []).map((landmarks: Point[], index: number) => ({
      landmarks,
      blendshapes: result.faceBlendshapes?.[index]?.categories ?? [],
    }));
  }

  private async detectObjects(): Promise<VisionObjectDetection[]> {
    if (!this.objectModel) return [];
    if (this.objectModel.isCustomGraphModel) return this.detectCustomObjects();
    return this.objectModel.detect(this.video);
  }

  private async detectCustomObjects(): Promise<VisionObjectDetection[]> {
    const input = this.tf.browser.fromPixels(this.video).expandDims(0).toFloat();
    const result = await this.objectModel.executeAsync(input);
    this.tf.dispose(input);
    const output = await readDetectionOutput(result);
    return normalizeTfjsDetectionOutput(output, this.video.videoWidth, this.video.videoHeight);
  }

  private estimateEyeMovement(landmarks: Point[], blendshapes = []): VisionEyeEstimate {
    const left = eyeDirection(landmarks, LEFT_EYE, LEFT_IRIS);
    const right = eyeDirection(landmarks, RIGHT_EYE, RIGHT_IRIS);
    const rawHorizontal = (left.horizontal + right.horizontal) / 2;
    const rawVertical = (left.vertical + right.vertical) / 2;
    const blendshapeGaze = estimateBlendshapeGaze(blendshapes);
    const isCalibrated = this.updateGazeCalibration(rawHorizontal, rawVertical);
    const horizontal = rawHorizontal - (this.gazeCalibration?.horizontal ?? 0);
    const vertical = rawVertical - (this.gazeCalibration?.vertical ?? 0);

    let direction = "center";
    if (horizontal < -HORIZONTAL_GAZE_THRESHOLD) direction = "left";
    if (horizontal > HORIZONTAL_GAZE_THRESHOLD) direction = "right";
    if (vertical < -VERTICAL_GAZE_THRESHOLD) direction = `${direction} up`;
    if (vertical > VERTICAL_GAZE_THRESHOLD) direction = `${direction} down`;
    if (blendshapeGaze.lookingAway) direction = blendshapeGaze.direction;

    const landmarkLookingAway =
      isCalibrated &&
      (Math.abs(horizontal) > HORIZONTAL_GAZE_THRESHOLD || Math.abs(vertical) > VERTICAL_GAZE_THRESHOLD);

    return {
      horizontal,
      vertical,
      direction: direction.trim(),
      lookingAway: isCalibrated && (landmarkLookingAway || blendshapeGaze.lookingAway),
      confidence: roundMetric(Math.max(Math.abs(horizontal), Math.abs(vertical), blendshapeGaze.score)),
      calibrated: isCalibrated,
    };
  }

  private updateGazeCalibration(horizontal: number, vertical: number) {
    if (this.gazeCalibration) return true;
    this.gazeCalibrationSamples.push({ horizontal, vertical });
    if (this.gazeCalibrationSamples.length < CALIBRATION_SAMPLE_COUNT) return false;
    this.gazeCalibration = averageCalibration(this.gazeCalibrationSamples);
    this.gazeCalibrationSamples = [];
    return true;
  }

  private resetGazeCalibration() {
    this.gazeCalibration = null;
    this.gazeCalibrationSamples = [];
  }

  private setStatus(status: VisionStatus, error?: string) {
    this.onStatus(status, error);
    if (status === "unavailable") {
      this.onResults({ objects: [], faces: [], status, error });
    }
  }
}

async function createFaceLandmarker(FaceLandmarker: any, fileset: any, delegate: "GPU" | "CPU") {
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: FACE_MODEL_URL,
      delegate,
    },
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
    numFaces: 3,
    runningMode: "VIDEO",
  });
}

async function loadTensorflow() {
  const tf = await import(/* @vite-ignore */ TFJS_ESM_URL);

  try {
    if (!tf.getBackend()) {
      await tf.setBackend("webgl").catch(() => tf.setBackend("cpu"));
    }
  } catch {
    await tf.setBackend("cpu");
  }

  await tf.ready();
  return tf;
}

function eyeDirection(landmarks: Point[], eyeIndexes: number[], irisIndexes: number[]) {
  const eye = eyeIndexes.map((index) => landmarks[index]);
  const iris = irisIndexes.map((index) => landmarks[index]);
  const left = eye[0];
  const right = eye[1];
  const top = eye[2];
  const bottom = eye[3];
  const center = averagePoint(iris);
  const eyeCenterX = (left.x + right.x) / 2;
  const eyeCenterY = (top.y + bottom.y) / 2;
  const eyeWidth = Math.max(Math.abs(right.x - left.x), 0.001);
  const eyeHeight = Math.max(Math.abs(bottom.y - top.y), 0.001);

  return {
    horizontal: (center.x - eyeCenterX) / eyeWidth,
    vertical: (center.y - eyeCenterY) / eyeHeight,
  };
}

function averagePoint(points: Point[]) {
  return points.reduce(
    (sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }),
    { x: 0, y: 0 },
  );
}

function averageCalibration(samples: Array<{ horizontal: number; vertical: number }>) {
  return samples.reduce(
    (sum, sample) => ({
      horizontal: sum.horizontal + sample.horizontal / samples.length,
      vertical: sum.vertical + sample.vertical / samples.length,
    }),
    { horizontal: 0, vertical: 0 },
  );
}

function roundMetric(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : null;
}

function estimateBlendshapeGaze(blendshapes: Array<{ categoryName: string; score?: number }>) {
  const scores = Object.fromEntries(blendshapes.map((shape) => [shape.categoryName, shape.score ?? 0]));
  const leftScore = Math.max(scores.eyeLookOutLeft ?? 0, scores.eyeLookInRight ?? 0);
  const rightScore = Math.max(scores.eyeLookInLeft ?? 0, scores.eyeLookOutRight ?? 0);
  const upScore = Math.max(scores.eyeLookUpLeft ?? 0, scores.eyeLookUpRight ?? 0);
  const downScore = Math.max(scores.eyeLookDownLeft ?? 0, scores.eyeLookDownRight ?? 0);
  const strongest = [
    { direction: "left", score: leftScore, threshold: BLENDSHAPE_SIDE_THRESHOLD },
    { direction: "right", score: rightScore, threshold: BLENDSHAPE_SIDE_THRESHOLD },
    { direction: "up", score: upScore, threshold: BLENDSHAPE_VERTICAL_THRESHOLD },
    { direction: "down", score: downScore, threshold: BLENDSHAPE_VERTICAL_THRESHOLD },
  ].sort((a, b) => b.score - a.score)[0];

  return {
    direction: strongest.score > strongest.threshold ? strongest.direction : "center",
    lookingAway: strongest.score > strongest.threshold,
    score: strongest.score,
  };
}

function estimateEmotion(
  blendshapes: Array<{ categoryName: string; score?: number }>, 
  landmarks: Point[]
): VisionEmotion {
  const scores = Object.fromEntries(blendshapes.map((shape) => [shape.categoryName, shape.score ?? 0]));
  
  const smileScore = (scores.mouthSmileLeft ?? 0) + (scores.mouthSmileRight ?? 0);
  const frownScore = (scores.mouthFrownLeft ?? 0) + (scores.mouthFrownRight ?? 0);
  const angryScore = (scores.browDownLeft ?? 0) + (scores.browDownRight ?? 0);

  if (smileScore > 0.15) return "happy";
  if (angryScore > 0.2) return "angry";
  if (frownScore > 0.15) return "sad";
  
  // Geometric Fallback for subtle expressions
  if (landmarks && landmarks.length > 300) {
    const leftCorner = landmarks[61];
    const rightCorner = landmarks[291];
    const topLip = landmarks[13];
    const bottomLip = landmarks[14];
    
    // Average Y of mouth corners
    const cornersY = (leftCorner.y + rightCorner.y) / 2;
    // Center of mouth Y
    const centerY = (topLip.y + bottomLip.y) / 2;
    
    // If corners are significantly higher than the center -> smile
    if (centerY - cornersY > 0.015) return "happy";
    
    // If corners are significantly lower than the center -> sad/frown
    if (cornersY - centerY > 0.01) return "sad";
  }
  
  return "neutral";
}

function getFaceBounds(landmarks: Point[], width: number, height: number) {
  const points = landmarks.map((point) => ({ x: point.x * width, y: point.y * height }));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

async function readDetectionOutput(result: any) {
  if (Array.isArray(result)) {
    const values = await Promise.all(result.map((tensor) => tensor.array()));
    result.forEach((tensor) => tensor.dispose?.());
    const [boxes = [], scores = [], classes = []] = values;
    return { boxes, scores, classes };
  }

  const output: any = {};
  const entries = Object.entries(result);
  await Promise.all(
    entries.map(async ([name, tensor]: [string, any]) => {
      const key = name.toLowerCase();
      if (key.includes("box")) output.boxes = await tensor.array();
      if (key.includes("score")) output.scores = await tensor.array();
      if (key.includes("class")) output.classes = await tensor.array();
      tensor.dispose?.();
    }),
  );
  return output;
}

function normalizeTfjsDetectionOutput(
  { boxes = [], scores = [], classes = [] }: { boxes?: any[]; scores?: any[]; classes?: any[] },
  width: number,
  height: number,
): VisionObjectDetection[] {
  const normalizedBoxes = boxes[0] ?? boxes;
  const normalizedScores = scores[0] ?? scores;
  const normalizedClasses = classes[0] ?? classes;

  return normalizedBoxes
    .map((box: number[], index: number) => {
      const score = Number(normalizedScores[index] ?? 0);
      if (score < 0.4) return null;
      const [yMin, xMin, yMax, xMax] = box;
      return {
        bbox: [xMin * width, yMin * height, (xMax - xMin) * width, (yMax - yMin) * height],
        score,
        class: `class ${normalizedClasses[index] ?? "?"}`,
      };
    })
    .filter(Boolean);
}
