"use client";

import * as React from "react";
import * as THREE from "three";
import { playTick } from "@/lib/sound";

// Ultra-short, deadpan micro-quips (under 8 words)
const MITHU_QUIPS = [
  "Still nothing?",
  "Blink once for help.",
  "Your cursor is lonely.",
  "Deep breath, zero thoughts.",
  "A rock moves faster.",
  "Wasting electricity.",
  "Just feed the chilli.",
  "Judging you silently.",
  "Zero words. Impressive.",
];

const CHILLI_FEED_QUIPS = [
  "Crunch. Finally, some taste.",
  "Tasty. Now fix your life.",
  "At least this chilli has flavor.",
  "Thanks. Now get to work.",
];

interface ChilliData {
  group: THREE.Group;
  initialPos: THREE.Vector3;
  initialRot: THREE.Euler;
  isDragging: boolean;
  isConsumed: boolean;
  eatAnimStartTime: number;
  respawnTime: number;
  scale: number;
}

export interface JudgeParrotProps {
  isExiting?: boolean;
}

// Procedural micro-noise canvas texture for subtle feather-grain bump mapping
function createFeatherNoiseTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.createImageData(size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const val = 128 + (Math.random() - 0.5) * 55;
    imgData.data[i] = val;
    imgData.data[i + 1] = val;
    imgData.data[i + 2] = val;
    imgData.data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

// Procedural longitudinal bark texture for wooden branch
function createBarkNoiseTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const v = 128 + Math.sin(x * 0.35) * 45 + (Math.random() - 0.5) * 70;
      imgData.data[idx] = v;
      imgData.data[idx + 1] = v;
      imgData.data[idx + 2] = v;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 6);
  return tex;
}

export function JudgeParrot({ isExiting = false }: JudgeParrotProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const speechBubbleRef = React.useRef<HTMLDivElement>(null);

  const [speechText, setSpeechText] = React.useState<string | null>(null);

  // Timers and interaction state
  const commentaryTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const isHoveredRef = React.useRef(false);
  const isExitingRef = React.useRef(isExiting);
  const mouseNormRef = React.useRef({ x: 0, y: 0 });

  // Sync isExiting prop & immediately dismiss speech on takeoff
  React.useEffect(() => {
    isExitingRef.current = isExiting;
    if (isExiting) {
      setSpeechText(null);
      if (commentaryTimerRef.current) clearTimeout(commentaryTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    }
  }, [isExiting]);

  // Displays speech and auto-dismisses
  const showSpeech = React.useCallback((text: string, duration = 3200) => {
    if (isExitingRef.current) return;
    setSpeechText(text);

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setSpeechText(null);
    }, duration);
  }, []);

  // Paced Commentary Cadence (unsolicited insult interval: 20 to 28 seconds)
  const scheduleNextCommentary = React.useCallback((delayMs?: number) => {
    if (commentaryTimerRef.current) clearTimeout(commentaryTimerRef.current);
    if (isExitingRef.current) return;
    const delay = delayMs ?? (20000 + Math.random() * 8000); // 20 to 28 seconds
    commentaryTimerRef.current = setTimeout(() => {
      if (isExitingRef.current) return;
      const quip = MITHU_QUIPS[Math.floor(Math.random() * MITHU_QUIPS.length)];
      showSpeech(quip, 3200);
      scheduleNextCommentary();
    }, delay);
  }, [showSpeech]);

  // Initial trigger after 4 seconds
  React.useEffect(() => {
    const initialTimer = setTimeout(() => {
      if (isExitingRef.current) return;
      const quip = MITHU_QUIPS[Math.floor(Math.random() * MITHU_QUIPS.length)];
      showSpeech(quip, 3200);
      scheduleNextCommentary();
    }, 4000);

    return () => {
      clearTimeout(initialTimer);
      if (commentaryTimerRef.current) clearTimeout(commentaryTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [scheduleNextCommentary, showSpeech]);

  // Three.js Scene Setup & Physics Loop
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 5.8);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. Three-Point Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xfffaed, 1.7);
    keyLight.position.set(3.5, 5, 4.5);
    scene.add(keyLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
    rimLight.position.set(-4, 2, -3.5);
    scene.add(rimLight);

    // 3. Textures
    const featherNoiseTex = createFeatherNoiseTexture();
    const barkNoiseTex = createBarkNoiseTexture();

    // 4. Materials
    const bodyFeatherMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Rich emerald mantle
      roughness: 0.7,
      metalness: 0.05,
      bumpMap: featherNoiseTex,
      bumpScale: 0.04,
    });

    const crownFeatherMat = new THREE.MeshStandardMaterial({
      color: 0x65a30d, // Lime flight & crown highlight
      roughness: 0.68,
      metalness: 0.05,
      bumpMap: featherNoiseTex,
      bumpScale: 0.035,
    });

    const breastFeatherMat = new THREE.MeshStandardMaterial({
      color: 0xa3e635, // Pastel yellow-green breast
      roughness: 0.72,
      metalness: 0.03,
      bumpMap: featherNoiseTex,
      bumpScale: 0.03,
    });

    const flightFeatherMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e, // Teal-toned folded primaries
      roughness: 0.62,
      metalness: 0.08,
      bumpMap: featherNoiseTex,
      bumpScale: 0.04,
    });

    const tailBaseMat = new THREE.MeshStandardMaterial({
      color: 0x047857,
      roughness: 0.65,
      metalness: 0.08,
    });

    const tailTipMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Turquoise-blue streamer tip
      roughness: 0.58,
      metalness: 0.1,
    });

    const blackRingMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.45,
      metalness: 0.08,
    });
    const roseRingMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.55,
      metalness: 0.04,
    });

    const cereMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.75,
      metalness: 0.02,
    });

    const beakCarmineMat = new THREE.MeshStandardMaterial({
      color: 0x881337,
      roughness: 0.2,
      metalness: 0.05,
    });
    const beakTipMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.22,
      metalness: 0.05,
    });
    const lowerBeakMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.35,
      metalness: 0.08,
    });

    const scleraMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.15,
    });
    const irisMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.2,
      metalness: 0.1,
      emissive: new THREE.Color(0x000000),
    });
    const pupilMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.1,
      emissive: new THREE.Color(0x000000),
    });
    const corneaMat = new THREE.MeshPhysicalMaterial({
      roughness: 0.05,
      transmission: 0.6,
      thickness: 0.12,
      ior: 1.34,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    const branchBarkMat = new THREE.MeshStandardMaterial({
      color: 0x3b2219,
      roughness: 0.9,
      metalness: 0.04,
      bumpMap: barkNoiseTex,
      bumpScale: 0.08,
    });
    const knotSpurMat = new THREE.MeshStandardMaterial({
      color: 0x24140e,
      roughness: 0.95,
      bumpMap: barkNoiseTex,
      bumpScale: 0.1,
    });
    const talonMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.65,
    });
    const clawKeratinMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.25,
      metalness: 0.1,
    });

    const chilliSkinMat = new THREE.MeshPhysicalMaterial({
      color: 0x15803d,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      metalness: 0.05,
    });
    const chilliCalyxMat = new THREE.MeshStandardMaterial({
      color: 0x14532d,
      roughness: 0.5,
    });
    const chilliStemMat = new THREE.MeshStandardMaterial({
      color: 0x365314,
      roughness: 0.6,
    });

    // 5. Parakeet ("Mithu") & Perch Hierarchy
    const mithuGroup = new THREE.Group();
    mithuGroup.position.set(-0.35, -0.2, 0);
    mithuGroup.rotation.y = 0.42;
    scene.add(mithuGroup);

    // Gnarled Curved Wooden Branch (Stays behind on perch during takeoff!)
    const branchCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.4, -1.38, 0.04),
      new THREE.Vector3(-1.0, -1.34, 0.12),
      new THREE.Vector3(0.0, -1.35, 0.15),
      new THREE.Vector3(1.0, -1.32, 0.18),
      new THREE.Vector3(2.4, -1.42, 0.06),
    ]);
    const branchGeo = new THREE.TubeGeometry(branchCurve, 40, 0.115, 16, false);
    const branchMesh = new THREE.Mesh(branchGeo, branchBarkMat);
    mithuGroup.add(branchMesh);

    for (const [kx, ky, kz, ks] of [
      [0.6, -1.33, 0.16, 0.09],
      [-0.8, -1.35, 0.13, 0.08],
      [1.2, -1.33, 0.17, 0.07],
    ]) {
      const knotGeo = new THREE.SphereGeometry(ks, 12, 10);
      knotGeo.scale(1.4, 0.8, 1.2);
      const knot = new THREE.Mesh(knotGeo, knotSpurMat);
      knot.position.set(kx, ky, kz);
      mithuGroup.add(knot);
    }

    // Bird Posture Group (Independent group that detaches and takes flight on exit!)
    const birdPostureGroup = new THREE.Group();
    birdPostureGroup.position.set(0, -1.15, 0.1);
    birdPostureGroup.rotation.x = 0.38; // ~22° natural forward perching lean
    mithuGroup.add(birdPostureGroup);

    // Aerodynamically Tapered Torso
    const torsoGeo = new THREE.SphereGeometry(0.85, 32, 24);
    torsoGeo.scale(0.66, 1.35, 0.72);
    const torsoMesh = new THREE.Mesh(torsoGeo, bodyFeatherMat);
    torsoMesh.position.set(0, 0.95, -0.05);
    birdPostureGroup.add(torsoMesh);

    // Smoothly Tapered Breast / Underbelly
    const breastGeo = new THREE.SphereGeometry(0.7, 24, 20);
    breastGeo.scale(0.56, 1.15, 0.46);
    const breastMesh = new THREE.Mesh(breastGeo, breastFeatherMat);
    breastMesh.position.set(0, 0.85, 0.3);
    birdPostureGroup.add(breastMesh);

    // Zygodactyl Talons attached to birdPostureGroup with individual references for flight retraction
    const createZygodactylFoot = (xPos: number) => {
      const foot = new THREE.Group();
      foot.position.set(xPos, -0.07, 0.04);

      const thigh = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.32, 12), bodyFeatherMat);
      thigh.rotation.x = Math.PI - 0.25;
      thigh.position.set(0, 0.12, 0);
      foot.add(thigh);

      for (let i = -1; i <= 1; i += 2) {
        const toe = new THREE.Group();
        toe.position.set(i * 0.07, -0.06, 0.08);

        const talon = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.28, 10), talonMat);
        talon.rotation.x = Math.PI / 3;
        toe.add(talon);

        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 8), clawKeratinMat);
        claw.rotation.x = Math.PI / 2 + 0.3;
        claw.position.set(0, -0.12, 0.12);
        toe.add(claw);

        foot.add(toe);
      }

      for (let i = -1; i <= 1; i += 2) {
        const toe = new THREE.Group();
        toe.position.set(i * 0.05, -0.06, -0.08);

        const talon = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.25, 10), talonMat);
        talon.rotation.x = -Math.PI / 3;
        toe.add(talon);

        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.09, 8), clawKeratinMat);
        claw.rotation.x = -(Math.PI / 2 + 0.3);
        claw.position.set(0, -0.11, -0.11);
        toe.add(claw);

        foot.add(toe);
      }
      return foot;
    };

    const leftFoot = createZygodactylFoot(-0.32);
    birdPostureGroup.add(leftFoot);
    const rightFoot = createZygodactylFoot(0.32);
    birdPostureGroup.add(rightFoot);

    // Streamer Tail
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.1, -0.45);
    tailPivot.rotation.x = -0.55;
    birdPostureGroup.add(tailPivot);

    const longTailGeo = new THREE.ConeGeometry(0.17, 2.3, 16);
    longTailGeo.rotateX(Math.PI);
    longTailGeo.scale(0.32, 1, 1.2);
    const longTail = new THREE.Mesh(longTailGeo, tailBaseMat);
    longTail.position.set(0, -1.0, 0);
    tailPivot.add(longTail);

    const tailTipGeo = new THREE.ConeGeometry(0.13, 1.0, 14);
    tailTipGeo.rotateX(Math.PI);
    tailTipGeo.scale(0.26, 1, 1.1);
    const tailTip = new THREE.Mesh(tailTipGeo, tailTipMat);
    tailTip.position.set(0, -1.6, 0.02);
    tailPivot.add(tailTip);

    // Folded Wings
    const leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(-0.58, 1.35, -0.05);
    birdPostureGroup.add(leftWingPivot);

    const leftShoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 20, 16).scale(0.48, 1.1, 0.85),
      bodyFeatherMat
    );
    leftShoulder.position.set(-0.06, -0.15, 0.05);
    leftWingPivot.add(leftShoulder);

    const leftFlightGeo = new THREE.ConeGeometry(0.3, 1.85, 16);
    leftFlightGeo.rotateZ(Math.PI - 0.16);
    leftFlightGeo.rotateX(-0.1);
    leftFlightGeo.scale(0.24, 1, 0.7);
    const leftFlight = new THREE.Mesh(leftFlightGeo, flightFeatherMat);
    leftFlight.position.set(-0.15, -0.85, -0.08);
    leftWingPivot.add(leftFlight);

    const rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(0.58, 1.35, -0.05);
    birdPostureGroup.add(rightWingPivot);

    const rightShoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 20, 16).scale(0.48, 1.1, 0.85),
      bodyFeatherMat
    );
    rightShoulder.position.set(0.06, -0.15, 0.05);
    rightWingPivot.add(rightShoulder);

    const rightFlightGeo = new THREE.ConeGeometry(0.3, 1.85, 16);
    rightFlightGeo.rotateZ(-(Math.PI - 0.16));
    rightFlightGeo.rotateX(-0.1);
    rightFlightGeo.scale(0.24, 1, 0.7);
    const rightFlight = new THREE.Mesh(rightFlightGeo, flightFeatherMat);
    rightFlight.position.set(0.15, -0.85, -0.08);
    rightWingPivot.add(rightFlight);

    // Throat & Ringneck Collar
    const throatGroup = new THREE.Group();
    throatGroup.position.set(0, 1.78, 0.05);
    birdPostureGroup.add(throatGroup);

    const neckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.55, 0.4, 24),
      bodyFeatherMat
    );
    throatGroup.add(neckMesh);

    const blackRingGeo = new THREE.TorusGeometry(0.48, 0.042, 16, 36);
    blackRingGeo.rotateX(Math.PI / 2 + 0.28);
    const blackRing = new THREE.Mesh(blackRingGeo, blackRingMat);
    blackRing.position.set(0, 0.04, 0.02);
    throatGroup.add(blackRing);

    const roseRingGeo = new THREE.TorusGeometry(0.47, 0.035, 16, 36);
    roseRingGeo.rotateX(Math.PI / 2 + 0.24);
    const roseRing = new THREE.Mesh(roseRingGeo, roseRingMat);
    roseRing.position.set(0, 0.09, -0.01);
    throatGroup.add(roseRing);

    // Head Pivot & Organic Skull
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 2.12, 0.1);
    birdPostureGroup.add(headPivot);

    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.64, 32, 26).scale(0.86, 0.98, 0.92),
      bodyFeatherMat
    );
    headPivot.add(headMesh);

    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 20, 16).scale(0.8, 0.42, 1.1),
      crownFeatherMat
    );
    crown.position.set(0, 0.44, -0.06);
    headPivot.add(crown);

    const cereGeo = new THREE.SphereGeometry(0.17, 16, 12);
    cereGeo.scale(1.2, 0.6, 0.8);
    const cere = new THREE.Mesh(cereGeo, cereMat);
    cere.position.set(0, 0.18, 0.6);
    headPivot.add(cere);

    for (const nox of [-0.07, 0.07]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), blackRingMat);
      nostril.position.set(nox, 0.19, 0.7);
      headPivot.add(nostril);
    }

    // Fully Closed Bill at Rest
    const beakBaseGeo = new THREE.ConeGeometry(0.23, 0.72, 20);
    beakBaseGeo.rotateX(Math.PI / 2 + 0.54);
    beakBaseGeo.scale(0.92, 1.0, 1.25);
    const beakBase = new THREE.Mesh(beakBaseGeo, beakCarmineMat);
    beakBase.position.set(0, -0.04, 0.74);
    headPivot.add(beakBase);

    const beakTipBoneGeo = new THREE.ConeGeometry(0.095, 0.32, 14);
    beakTipBoneGeo.rotateX(Math.PI / 2 + 0.9);
    const beakTipBone = new THREE.Mesh(beakTipBoneGeo, beakTipMat);
    beakTipBone.position.set(0, -0.24, 0.94);
    headPivot.add(beakTipBone);

    // Articulated Lower Mandible
    const lowerBeakPivot = new THREE.Group();
    lowerBeakPivot.position.set(0, -0.14, 0.62);
    headPivot.add(lowerBeakPivot);

    const lowerBeakGeo = new THREE.ConeGeometry(0.15, 0.32, 16);
    lowerBeakGeo.rotateX(Math.PI / 2 - 0.05);
    lowerBeakGeo.scale(0.85, 0.9, 1.0);
    const lowerBeak = new THREE.Mesh(lowerBeakGeo, lowerBeakMat);
    lowerBeak.position.set(0, -0.04, 0.08);
    lowerBeakPivot.add(lowerBeak);

    // Recessed Eyes
    const createRecessedEye = (xDir: number) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(xDir * 0.32, 0.14, 0.38);
      eyeGroup.rotation.y = xDir * 0.4;

      const socket = new THREE.Mesh(
        new THREE.TorusGeometry(0.105, 0.02, 10, 20),
        bodyFeatherMat
      );
      eyeGroup.add(socket);

      const eyeSclera = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), scleraMat);
      eyeGroup.add(eyeSclera);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 14), irisMat);
      iris.position.set(0, 0, 0.04);
      eyeGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 12), pupilMat);
      pupil.position.set(0, 0, 0.07);
      eyeGroup.add(pupil);

      const cornea = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 18, 14),
        corneaMat
      );
      cornea.position.set(0, 0, 0.05);
      eyeGroup.add(cornea);

      return { eyeGroup, pupil };
    };

    const leftEye = createRecessedEye(-1);
    headPivot.add(leftEye.eyeGroup);
    const rightEye = createRecessedEye(1);
    headPivot.add(rightEye.eyeGroup);

    // Real-World Indian Green Chilli (Hari Mirch) Modeling
    const chillies: ChilliData[] = [];
    const interactiveChilliHitboxes: THREE.Mesh[] = [];

    const createHariMirch = (posX: number, posY: number, posZ: number, rotZ: number): ChilliData => {
      const chilliGroup = new THREE.Group();
      chilliGroup.position.set(posX, posY, posZ);
      chilliGroup.rotation.set(0.1, 0, rotZ);

      const chilliCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.38, 0),
        new THREE.Vector3(0.05, 0.18, 0.02),
        new THREE.Vector3(0.08, -0.05, 0.01),
        new THREE.Vector3(0.04, -0.25, -0.01),
        new THREE.Vector3(-0.02, -0.42, 0.01),
        new THREE.Vector3(-0.05, -0.52, 0.02),
      ]);
      const bodyGeo = new THREE.TubeGeometry(chilliCurve, 24, 0.072, 14, false);
      const bodyMesh = new THREE.Mesh(bodyGeo, chilliSkinMat);
      chilliGroup.add(bodyMesh);

      const calyxGroup = new THREE.Group();
      calyxGroup.position.set(0, 0.38, 0);
      for (let i = 0; i < 5; i++) {
        const lobeGeo = new THREE.ConeGeometry(0.038, 0.12, 6);
        lobeGeo.rotateX(Math.PI / 2 + 0.35);
        lobeGeo.rotateY((i * (Math.PI * 2)) / 5);
        const lobe = new THREE.Mesh(lobeGeo, chilliCalyxMat);
        lobe.position.set(0, -0.02, 0);
        calyxGroup.add(lobe);
      }
      chilliGroup.add(calyxGroup);

      const stemCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.38, 0),
        new THREE.Vector3(-0.04, 0.52, 0.03),
        new THREE.Vector3(-0.1, 0.64, 0.06),
      ]);
      const stemMesh = new THREE.Mesh(
        new THREE.TubeGeometry(stemCurve, 12, 0.02, 8, false),
        chilliStemMat
      );
      chilliGroup.add(stemMesh);

      const hitBoxGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.1, 8);
      const hitBox = new THREE.Mesh(
        hitBoxGeo,
        new THREE.MeshBasicMaterial({ visible: false })
      );
      chilliGroup.add(hitBox);
      interactiveChilliHitboxes.push(hitBox);

      mithuGroup.add(chilliGroup);

      return {
        group: chilliGroup,
        initialPos: new THREE.Vector3(posX, posY, posZ),
        initialRot: new THREE.Euler(0.1, 0, rotZ),
        isDragging: false,
        isConsumed: false,
        eatAnimStartTime: 0,
        respawnTime: 0,
        scale: 1,
      };
    };

    chillies.push(createHariMirch(0.52, -1.22, 0.22, -0.52));
    chillies.push(createHariMirch(0.96, -1.25, 0.24, -0.32));

    // Green Crunch Particles
    const crunchParticles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];
    const particleGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);

    const spawnCrunchParticles = (origin: THREE.Vector3) => {
      for (let i = 0; i < 14; i++) {
        const pMesh = new THREE.Mesh(particleGeo, chilliSkinMat);
        pMesh.position.copy(origin);
        scene.add(pMesh);
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 0.22,
          Math.random() * 0.2 + 0.06,
          (Math.random() - 0.5) * 0.22
        );
        crunchParticles.push({ mesh: pMesh, vel, life: 1.0 });
      }
    };

    // 6. Screen-Space Feeding Collision System
    let activeDragIndex: number | null = null;
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const planeIntersection = new THREE.Vector3();

    let isChomping = false;
    let chompTimer = 0;

    const checkAndExecuteFeeding = (chilliIdx: number): boolean => {
      const chilli = chillies[chilliIdx];
      if (chilli.isConsumed || isExitingRef.current) return false;

      const beakWorld = new THREE.Vector3();
      const chilliWorld = new THREE.Vector3();
      beakTipBone.getWorldPosition(beakWorld);
      chilli.group.getWorldPosition(chilliWorld);

      // Project both world positions into 2D camera viewport coordinates (NDC)
      const beakScreen = beakWorld.clone().project(camera);
      const chilliScreen = chilliWorld.clone().project(camera);

      // 2D distance on screen (immune to Z-depth camera clipping)
      const screenDist = Math.hypot(beakScreen.x - chilliScreen.x, beakScreen.y - chilliScreen.y);

      // Generous screen-space proximity threshold
      if (screenDist < 0.22) {
        chilli.isConsumed = true;
        chilli.isDragging = false;
        activeDragIndex = null;
        chilli.eatAnimStartTime = clock.getElapsedTime();
        chilli.respawnTime = clock.getElapsedTime() + 6.0;

        const localBeakPos = mithuGroup.worldToLocal(beakWorld.clone());
        chilli.group.position.copy(localBeakPos);

        spawnCrunchParticles(beakWorld);
        playTick();

        isChomping = true;
        chompTimer = 0;

        const insult = CHILLI_FEED_QUIPS[Math.floor(Math.random() * CHILLI_FEED_QUIPS.length)];
        showSpeech(insult, 4000);
        scheduleNextCommentary(24000);

        return true;
      }
      return false;
    };

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (isExitingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      const insideX = clientX >= rect.left && clientX <= rect.right;
      const insideY = clientY >= rect.top && clientY <= rect.bottom;

      if (!insideX || !insideY) {
        if (activeDragIndex === null) {
          canvas.style.pointerEvents = "none";
          isHoveredRef.current = false;
        }
        return;
      }

      pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
      mouseNormRef.current = { x: pointerNDC.x, y: pointerNDC.y };

      raycaster.setFromCamera(pointerNDC, camera);

      if (activeDragIndex !== null) {
        canvas.style.pointerEvents = "auto";
        canvas.style.cursor = "grabbing";

        raycaster.ray.intersectPlane(dragPlane, planeIntersection);
        const chilli = chillies[activeDragIndex];
        const localPos = mithuGroup.worldToLocal(planeIntersection.clone());
        chilli.group.position.copy(localPos);

        checkAndExecuteFeeding(activeDragIndex);
        return;
      }

      const hits = raycaster.intersectObjects([
        ...interactiveChilliHitboxes,
        torsoMesh,
        headMesh,
        beakBase,
      ]);

      if (hits.length > 0) {
        canvas.style.pointerEvents = "auto";
        isHoveredRef.current = true;
        const hitChilli = hits.find((h) =>
          interactiveChilliHitboxes.includes(h.object as THREE.Mesh)
        );
        if (hitChilli) {
          canvas.style.cursor = "grab";
        } else {
          canvas.style.cursor = "pointer";
        }
      } else {
        canvas.style.pointerEvents = "none";
        isHoveredRef.current = false;
        canvas.style.cursor = "default";
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (isExitingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointerNDC, camera);

      const hits = raycaster.intersectObjects(interactiveChilliHitboxes);
      if (hits.length > 0) {
        const hitMesh = hits[0].object as THREE.Mesh;
        const chilliIdx = interactiveChilliHitboxes.indexOf(hitMesh);
        if (chilliIdx !== -1 && !chillies[chilliIdx].isConsumed) {
          activeDragIndex = chilliIdx;
          chillies[chilliIdx].isDragging = true;

          const chilliWorld = new THREE.Vector3();
          chillies[chilliIdx].group.getWorldPosition(chilliWorld);
          dragPlane.constant = -chilliWorld.z;
          canvas.style.cursor = "grabbing";
        }
      }
    };

    const handlePointerUp = () => {
      if (activeDragIndex !== null) {
        const fed = checkAndExecuteFeeding(activeDragIndex);
        if (!fed) {
          chillies[activeDragIndex].isDragging = false;
        }
        activeDragIndex = null;
        canvas.style.cursor = "default";
      }
    };

    window.addEventListener("pointermove", handleGlobalPointerMove, { passive: false });
    window.addEventListener("pointerdown", handlePointerDown, { passive: false });
    window.addEventListener("pointerup", handlePointerUp, { passive: false });

    // 7. Avian Saccades & Animation Loop with Natural Cadence Flight Dynamics
    let targetHeadY = 0;
    let targetHeadX = 0;
    let targetHeadZ = 0;
    let nextSaccadeTime = 1.4;
    let isSaccading = false;
    let saccadeStartTime = 0;
    const saccadeDuration = 0.11;

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const delta = clock.getDelta();
      const hovered = isHoveredRef.current;

      // Update crunch particles
      for (let i = crunchParticles.length - 1; i >= 0; i--) {
        const p = crunchParticles[i];
        p.life -= 0.035;
        p.vel.y -= 0.008;
        p.mesh.position.add(p.vel);
        p.mesh.scale.multiplyScalar(0.93);
        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          crunchParticles.splice(i, 1);
        }
      }

      // Handle Chilli Respawns & 0.25s Consumption
      chillies.forEach((c) => {
        if (c.isConsumed) {
          const eatElapsed = elapsedTime - c.eatAnimStartTime;
          c.scale = THREE.MathUtils.clamp(1 - eatElapsed / 0.25, 0, 1);
          c.group.scale.set(c.scale, c.scale, c.scale);

          if (elapsedTime >= c.respawnTime) {
            c.isConsumed = false;
            c.group.position.copy(c.initialPos);
            c.group.rotation.copy(c.initialRot);
          }
        } else {
          c.scale = THREE.MathUtils.lerp(c.scale, 1, 0.15);
          c.group.scale.set(c.scale, c.scale, c.scale);

          if (!c.isDragging) {
            c.group.position.lerp(c.initialPos, 0.14);
            c.group.rotation.x = THREE.MathUtils.lerp(c.group.rotation.x, c.initialRot.x, 0.14);
            c.group.rotation.y = THREE.MathUtils.lerp(c.group.rotation.y, c.initialRot.y, 0.14);
            c.group.rotation.z = THREE.MathUtils.lerp(c.group.rotation.z, c.initialRot.z, 0.14);
          }
        }
      });

      // Rapid Chomping: lower beak pivots momentarily and returns flush
      if (isChomping) {
        chompTimer += delta * 18;
        lowerBeakPivot.rotation.x = -Math.sin(chompTimer) * 0.35;
        headPivot.position.z = 0.1 + Math.sin(chompTimer * 0.5) * 0.06;
        if (chompTimer >= Math.PI * 4) {
          isChomping = false;
          lowerBeakPivot.rotation.x = 0;
          headPivot.position.z = 0.1;
        }
      } else {
        lowerBeakPivot.rotation.x = 0;
      }

      // TAKEOFF & UPWARD FLY-OUT EXIT ANIMATION
      if (isExitingRef.current) {
        // Dismiss any open speech bubble
        setSpeechText((prev) => (prev !== null ? null : prev));

        // Retract talons flush against belly
        leftFoot.rotation.x = THREE.MathUtils.lerp(leftFoot.rotation.x, 1.2, delta * 4);
        rightFoot.rotation.x = THREE.MathUtils.lerp(rightFoot.rotation.x, 1.2, delta * 4);

        // Pitch body up for takeoff (ascending flight angle)
        birdPostureGroup.rotation.x = THREE.MathUtils.lerp(birdPostureGroup.rotation.x, -0.45, delta * 3);
        birdPostureGroup.rotation.z = THREE.MathUtils.lerp(birdPostureGroup.rotation.z, -0.25, delta * 3);

        // Realistic flapping wing beats
        const flapSpeed = clock.getElapsedTime() * 14;
        leftWingPivot.rotation.z = Math.sin(flapSpeed) * 0.75;
        rightWingPivot.rotation.z = -Math.sin(flapSpeed) * 0.75;

        // Rhythmic vertical climb bob + upward movement
        birdPostureGroup.position.y += delta * 3.2 + Math.sin(flapSpeed) * 0.02;
        birdPostureGroup.position.x += delta * 1.5;
        birdPostureGroup.position.z += delta * 1.0;
      } else {
        // Feet in normal perching position
        leftFoot.rotation.x = THREE.MathUtils.lerp(leftFoot.rotation.x, 0, delta * 4);
        rightFoot.rotation.x = THREE.MathUtils.lerp(rightFoot.rotation.x, 0, delta * 4);

        if (hovered && !isChomping) {
          // Hover Agitated State
          irisMat.color.lerp(new THREE.Color(0xdc2626), 0.2);
          irisMat.emissive.lerp(new THREE.Color(0x991b1b), 0.2);
          pupilMat.color.lerp(new THREE.Color(0x450a0a), 0.2);

          const pupilScale = THREE.MathUtils.lerp(leftEye.pupil.scale.x, 0.65, 0.2);
          leftEye.pupil.scale.set(pupilScale, pupilScale, pupilScale);
          rightEye.pupil.scale.set(pupilScale, pupilScale, pupilScale);

          const cursorHeadY = mouseNormRef.current.x * 0.55;
          const cursorHeadX = -mouseNormRef.current.y * 0.42;
          headPivot.rotation.y = THREE.MathUtils.lerp(headPivot.rotation.y, cursorHeadY, 0.18);
          headPivot.rotation.x = THREE.MathUtils.lerp(headPivot.rotation.x, cursorHeadX, 0.18);
          headPivot.rotation.z = THREE.MathUtils.lerp(headPivot.rotation.z, 0, 0.15);

          throatGroup.scale.lerp(new THREE.Vector3(1.08, 1.08, 1.08), 0.15);

          const wingTwitch = Math.sin(elapsedTime * 18) * 0.15;
          leftWingPivot.rotation.z = THREE.MathUtils.lerp(leftWingPivot.rotation.z, 0.22 + wingTwitch, 0.25);
          rightWingPivot.rotation.z = THREE.MathUtils.lerp(rightWingPivot.rotation.z, -0.22 - wingTwitch, 0.25);
        } else if (!isChomping) {
          // Idle Calm State
          irisMat.color.lerp(new THREE.Color(0xd97706), 0.08);
          irisMat.emissive.lerp(new THREE.Color(0x000000), 0.08);
          pupilMat.color.lerp(new THREE.Color(0x09090b), 0.08);

          const pupilScale = THREE.MathUtils.lerp(leftEye.pupil.scale.x, 1.0, 0.1);
          leftEye.pupil.scale.set(pupilScale, pupilScale, pupilScale);
          rightEye.pupil.scale.set(pupilScale, pupilScale, pupilScale);

          throatGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);

          const breath = Math.sin(elapsedTime * 1.8) * 0.035;
          leftWingPivot.rotation.z = THREE.MathUtils.lerp(leftWingPivot.rotation.z, breath, 0.08);
          rightWingPivot.rotation.z = THREE.MathUtils.lerp(rightWingPivot.rotation.z, -breath, 0.08);

          tailPivot.rotation.z = Math.sin(elapsedTime * 1.4) * 0.04;

          // Avian Saccades
          if (elapsedTime > nextSaccadeTime && !isSaccading) {
            isSaccading = true;
            saccadeStartTime = elapsedTime;
            targetHeadY = (Math.random() - 0.45) * 0.65;
            targetHeadX = (Math.random() - 0.5) * 0.28;
            targetHeadZ = (Math.random() - 0.5) * 0.18;
          }

          if (isSaccading) {
            const progress = Math.min((elapsedTime - saccadeStartTime) / saccadeDuration, 1);
            headPivot.rotation.y = THREE.MathUtils.lerp(headPivot.rotation.y, targetHeadY, progress);
            headPivot.rotation.x = THREE.MathUtils.lerp(headPivot.rotation.x, targetHeadX, progress);
            headPivot.rotation.z = THREE.MathUtils.lerp(headPivot.rotation.z, targetHeadZ, progress);

            if (progress >= 1) {
              isSaccading = false;
              nextSaccadeTime = elapsedTime + 1.6 + Math.random() * 2.2;
            }
          }
        }
      }

      // Project Beak Position into 2D Screen Space for Speech Bubble Alignment
      if (speechBubbleRef.current && !isExitingRef.current) {
        const beakWorld = new THREE.Vector3();
        beakTipBone.getWorldPosition(beakWorld);
        const proj = beakWorld.clone().project(camera);
        const screenX = ((proj.x + 1) * width) / 2 + 12;
        const screenY = ((-proj.y + 1) * height) / 2 - 20;
        speechBubbleRef.current.style.left = `${Math.round(screenX)}px`;
        speechBubbleRef.current.style.top = `${Math.round(screenY)}px`;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);

      featherNoiseTex.dispose();
      barkNoiseTex.dispose();

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [scheduleNextCommentary, showSpeech]);

  return (
    <div
      ref={containerRef}
      className="fixed top-32 left-4 md:top-36 md:left-8 z-30 w-64 h-64 md:w-80 md:h-80 select-none pointer-events-none"
      aria-label="Judging Indian Ringneck Parakeet Mascot (Mithu)"
    >
      {/* 3D Canvas with pointer-events toggled via raycasting */}
      <canvas
        ref={canvasRef}
        className="w-full h-full drop-shadow-2xl"
        style={{ touchAction: "none" }}
      />

      {/* Floating Glassmorphic Dialogue Pill Anchored Smoothly in 2D Screen Space */}
      {speechText && !isExiting && (
        <div
          ref={speechBubbleRef}
          role="status"
          aria-live="polite"
          className="pointer-events-auto absolute z-40 max-w-[210px] md:max-w-[250px] bg-zinc-900/90 border border-amber-500/30 text-amber-100 text-xs font-mono rounded-xl p-2.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          style={{ left: "130px", top: "90px" }}
        >
          {/* Triangular Tail pointing directly toward Mithu's beak */}
          <div
            className="absolute -left-2 top-3 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[7px] border-r-zinc-900/90"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-0.5">
              <span className="text-amber-400 font-bold text-[10px] md:text-[11px]">
                Mithu 🦜
              </span>
              <span className="text-[8px] uppercase tracking-wider text-emerald-400 font-semibold bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-500/30">
                Chief Critic
              </span>
            </div>
            <p className="leading-snug text-[10px] md:text-[11px] text-amber-50/95 italic pt-0.5">
              &ldquo;{speechText}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default JudgeParrot;
