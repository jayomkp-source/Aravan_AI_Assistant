/**
 * HolographicSkull.tsx - Interactive Cyberpunk 3D Holographic Skull Core
 *
 * Features:
 * - Three.js WebGL 3D holographic wireframe skull with UnrealBloomPass bloom
 * - Real-time Web Audio AnalyserNode audio-reactive TMJ mandible jawbone animation
 * - Unified real-time sync with SkullControlsContext (all 16 sliders, colorMix, presets, reset)
 * - Echo-Shield / Stop Listening During Speech indicators
 * - Visible internal glowing neural brain structures (lobes, cerebellum, brainstem)
 * - Organic motion damping with live Cursor Follow Strength reactivity
 * - Dynamic particle density via BufferGeometry.setDrawRange + FogExp2 modulation
 * - Clean GPU resource disposal on unmount & throttled HUD updates (no 60fps React thrash)
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { VoiceState, GlowLevel, SkullControlSettings } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useSkullControls } from '../context/SkullControlsContext';
import { AudioReactiveCore } from '../audio/AudioReactiveCore';
import { StateManager } from '../state/StateManager';
import {
  buildARAVANSkull,
  SkullParts,
  applyThemeToSkull,
  computeBlendedSkullColors,
} from './skull/SkullGeometryBuilder';
import {
  Activity,
  Cpu,
  Sparkles,
} from 'lucide-react';

interface HolographicSkullProps {
  voiceState: VoiceState;
  micVolume: number;
  speakerVolume: number;
  glowLevel?: GlowLevel;
  onGlowLevelChange?: (level: GlowLevel) => void;
  stopListeningWhileSpeaking?: boolean;
  onToggleStopListeningWhileSpeaking?: () => void;
  onClick?: () => void;
  onActiveTalkingToggle?: () => void;
}

export type RenderMode = 'wireframe' | 'points' | 'shaded';

const MAX_PARTICLES = 600;

export const HolographicSkull: React.FC<HolographicSkullProps> = ({
  voiceState,
  micVolume,
  speakerVolume,
  glowLevel = 'surge',
  stopListeningWhileSpeaking = true,
}) => {
  const { currentTheme } = useTheme();
  const { controls } = useSkullControls();

  const controlsRef = useRef<SkullControlSettings>(controls);
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);

  // HUD & Telemetry States (throttled cleanly to prevent 60fps React re-renders)
  const [renderMode, setRenderMode] = useState<RenderMode>('wireframe');
  const [neuralLoad, setNeuralLoad] = useState<number>(42);
  const [synapseFreq, setSynapseFreq] = useState<number>(4.8);
  const [jawAngleDeg, setJawAngleDeg] = useState<number>(0);
  const [fps, setFps] = useState<number>(60);

  // Scene & material refs synchronized cleanly between React effects and WebGL loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const fogRef = useRef<THREE.FogExp2 | null>(null);
  const partsRef = useRef<SkullParts | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ringMat1Ref = useRef<THREE.MeshBasicMaterial | null>(null);
  const ringMat2Ref = useRef<THREE.MeshBasicMaterial | null>(null);
  const particleGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const particleMatRef = useRef<THREE.PointsMaterial | null>(null);
  const floorGridRef = useRef<THREE.GridHelper | null>(null);
  const galaxyGroupRef = useRef<THREE.Group | null>(null);
  const galaxyGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const galaxyMatRef = useRef<THREE.PointsMaterial | null>(null);
  const coreHaloMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const coreHaloTexRef = useRef<THREE.CanvasTexture | null>(null);

  const stateRef = useRef({
    voiceState,
    micVolume,
    speakerVolume,
    currentTheme,
    renderMode,
    glowLevel,
  });

  useEffect(() => {
    stateRef.current = {
      voiceState,
      micVolume,
      speakerVolume,
      currentTheme,
      renderMode,
      glowLevel,
    };
  }, [voiceState, micVolume, speakerVolume, currentTheme, renderMode, glowLevel]);

  /**
   * Single unified material + scene synchronizer.
   * Replaces previous conflicting theme/glow/slider effects so every slider,
   * color mix weight, renderMode, and theme preset composes harmoniously.
   */
  useEffect(() => {
    const parts = partsRef.current;
    if (!parts) return;

    const mix = {
      cyan: controls.colorMix.cyan,
      purple: controls.colorMix.purple,
      blue: controls.colorMix.blue,
      magenta: controls.colorMix.magenta,
      cyanEnergy: controls.cyanEnergy,
      purpleEnergy: controls.purpleEnergy,
    };

    const { primary, secondary } = computeBlendedSkullColors(currentTheme, mix);
    applyThemeToSkull(parts, currentTheme, mix);

    const masterNorm = controls.masterGlow / 100;
    const eyeNorm = controls.eyeGlow / 100;
    const electricNorm = controls.electricGlow / 100;
    const purpleNorm = controls.purpleEnergy / 100;
    const cyanNorm = controls.cyanEnergy / 100;
    const particlesNorm = controls.particles / 100;
    const fogNorm = controls.fog / 100;

    // 1. Cranium & Mandible Surface + Wireframe + Points (Render Mode aware)
    const isWireframe = renderMode === 'wireframe';
    const isPoints = renderMode === 'points';
    const isShaded = renderMode === 'shaded';

    if (parts.materials.skullSurface) {
      parts.materials.skullSurface.emissiveIntensity =
        (isShaded ? 0.55 : isPoints ? 0.12 : 0.38) * (masterNorm / 0.75) * (0.4 + cyanNorm * 0.6);
      parts.materials.skullSurface.opacity =
        masterNorm <= 0.01
          ? 0.08
          : isShaded
          ? 0.58
          : isPoints
          ? 0.08
          : 0.24 + masterNorm * 0.18;
      parts.materials.skullSurface.needsUpdate = true;
    }

    if (parts.materials.wireframe) {
      parts.materials.wireframe.opacity =
        (isWireframe ? 0.78 : isShaded ? 0.36 : 0.18) * electricNorm;
      parts.materials.wireframe.needsUpdate = true;
    }
    parts.craniumWireframe.visible = electricNorm > 0.01;
    parts.jawWireframe.visible = electricNorm > 0.01;

    if (parts.materials.glowPoints) {
      parts.materials.glowPoints.opacity = isPoints
        ? Math.max(0.2, 0.95 * Math.max(electricNorm, masterNorm))
        : 0;
      parts.materials.glowPoints.size = isPoints ? 0.032 + masterNorm * 0.02 : 0.025;
      parts.materials.glowPoints.needsUpdate = true;
    }
    parts.craniumPoints.visible = isPoints;
    parts.jawPoints.visible = isPoints;

    // 2. Electric Fissures & Teeth
    if (parts.materials.fissures) {
      parts.materials.fissures.opacity = Math.min(1.0, electricNorm * (0.55 + cyanNorm * 0.65));
      parts.materials.fissures.needsUpdate = true;
    }
    if (parts.materials.teeth) {
      parts.materials.teeth.emissiveIntensity = 0.45 * masterNorm * (0.35 + electricNorm * 0.8);
      parts.materials.teeth.needsUpdate = true;
    }

    // 3. Purple Energy Internal Brain & Neural Structures
    const brainIntensity = masterNorm * (0.25 + purpleNorm * 1.15);
    if (parts.materials.brain) {
      parts.materials.brain.emissiveIntensity = 0.75 * brainIntensity;
      parts.materials.brain.opacity = 0.25 + purpleNorm * 0.7;
      parts.materials.brain.needsUpdate = true;
    }
    if (parts.materials.innerBrain) {
      parts.materials.innerBrain.emissiveIntensity = 0.48 * brainIntensity;
      parts.materials.innerBrain.opacity = 0.12 + purpleNorm * 0.34;
      parts.materials.innerBrain.needsUpdate = true;
    }
    if (parts.materials.cerebellum) {
      parts.materials.cerebellum.emissiveIntensity = 0.65 * brainIntensity;
      parts.materials.cerebellum.opacity = 0.2 + purpleNorm * 0.68;
      parts.materials.cerebellum.needsUpdate = true;
    }
    if (parts.materials.brainStem) {
      parts.materials.brainStem.emissiveIntensity = 0.6 * brainIntensity;
      parts.materials.brainStem.opacity = 0.2 + purpleNorm * 0.65;
      parts.materials.brainStem.needsUpdate = true;
    }

    // 4. Eyes (Outer Iris, Inner Iris, Pupil Flare, PointLights)
    [parts.materials.eyeIris, parts.materials.eyeIrisRight].forEach((mat) => {
      if (!mat) return;
      mat.opacity = 0.12 + eyeNorm * 0.88;
      mat.needsUpdate = true;
    });
    [parts.materials.eyeIrisInnerLeft, parts.materials.eyeIrisInnerRight].forEach((mat) => {
      if (!mat) return;
      mat.opacity = 0.15 + eyeNorm * 0.85;
      mat.needsUpdate = true;
    });
    [parts.materials.eyePupil, parts.materials.eyePupilRight].forEach((mat) => {
      if (!mat) return;
      mat.opacity = 0.15 + eyeNorm * 0.85;
      mat.color.copy(new THREE.Color(0x334155).lerp(new THREE.Color(0xffffff), eyeNorm));
      mat.needsUpdate = true;
    });

    // 5. Scene Lights & Emitter Rings
    if (ambientLightRef.current) {
      ambientLightRef.current.color.copy(primary);
      ambientLightRef.current.intensity = 0.15 + masterNorm * 0.55;
    }
    if (rimLightRef.current) {
      rimLightRef.current.color.copy(secondary);
      rimLightRef.current.intensity = 0.4 + masterNorm * (0.9 + cyanNorm * 0.8 + purpleNorm * 0.8);
    }
    if (ringMat1Ref.current) {
      ringMat1Ref.current.color.copy(primary);
      ringMat1Ref.current.opacity = Math.min(1, 0.12 + electricNorm * 0.72 * (0.4 + cyanNorm * 0.6));
      ringMat1Ref.current.needsUpdate = true;
    }
    if (ringMat2Ref.current) {
      ringMat2Ref.current.color.copy(secondary);
      ringMat2Ref.current.opacity = Math.min(1, 0.12 + electricNorm * 0.72 * (0.4 + purpleNorm * 0.6));
      ringMat2Ref.current.needsUpdate = true;
    }
    if (floorGridRef.current) {
      const gridMat = floorGridRef.current.material as THREE.Material | THREE.Material[];
      const mats = Array.isArray(gridMat) ? gridMat : [gridMat];
      mats.forEach((m: any, idx: number) => {
        if (m?.color && idx === 0) m.color.copy(primary);
        if (m) {
          m.opacity = 0.08 + masterNorm * 0.35;
          m.needsUpdate = true;
        }
      });
    }

    // 6. Particle Cloud Density (setDrawRange + Size + Opacity)
    if (particleGeoRef.current) {
      const activeCount = Math.round(particlesNorm * MAX_PARTICLES);
      particleGeoRef.current.setDrawRange(0, activeCount);
    }
    if (particleMatRef.current) {
      particleMatRef.current.color.copy(primary);
      particleMatRef.current.opacity = particlesNorm <= 0.01 ? 0 : 0.15 + particlesNorm * 0.75;
      particleMatRef.current.size = 0.022 + particlesNorm * 0.025;
      particleMatRef.current.needsUpdate = true;
    }

    // 7. Cosmic Spiral Galaxy Palette & Density
    if (galaxyMatRef.current) {
      galaxyMatRef.current.opacity = 0.18 + particlesNorm * 0.58;
      galaxyMatRef.current.size = 0.036 + masterNorm * 0.024;
      galaxyMatRef.current.needsUpdate = true;
    }
    if (galaxyGeoRef.current) {
      const colorAttr = galaxyGeoRef.current.attributes.color;
      if (colorAttr) {
        const arr = colorAttr.array as Float32Array;
        const starCoreCol = new THREE.Color(0xffffff);
        const count = arr.length / 3;
        for (let i = 0; i < count; i++) {
          const ratio = (i % 30) / 30;
          const col = primary.clone().lerp(secondary, ratio);
          if (i % 5 === 0) col.lerp(starCoreCol, 0.65);
          arr[i * 3] = col.r;
          arr[i * 3 + 1] = col.g;
          arr[i * 3 + 2] = col.b;
        }
        colorAttr.needsUpdate = true;
      }
    }
    if (coreHaloMatRef.current) {
      const haloCanvas = document.createElement('canvas');
      haloCanvas.width = 64;
      haloCanvas.height = 64;
      const haloCtx = haloCanvas.getContext('2d')!;
      const haloGrad = haloCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
      haloGrad.addColorStop(0, `#${primary.getHexString()}`);
      haloGrad.addColorStop(0.45, `#${secondary.getHexString()}`);
      haloGrad.addColorStop(1, 'transparent');
      haloCtx.fillStyle = haloGrad;
      haloCtx.fillRect(0, 0, 64, 64);

      if (coreHaloTexRef.current) {
        coreHaloTexRef.current.dispose();
      }
      const nextTex = new THREE.CanvasTexture(haloCanvas);
      coreHaloTexRef.current = nextTex;
      coreHaloMatRef.current.map = nextTex;
      coreHaloMatRef.current.needsUpdate = true;
    }

    // 8. Immediate Fog Density Baseline
    if (fogRef.current) {
      fogRef.current.density = fogNorm * 0.22;
    }
  }, [currentTheme, renderMode, controls]);

  // Three.js Interactive Scene Setup (Single Renderer & Animation Loop)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const stateManager = StateManager.getInstance();
    let width = container.clientWidth || 600;
    let height = container.clientHeight || 520;

    // 1. Scene, Fog, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const fog = new THREE.FogExp2(0x04020a, (controlsRef.current.fog / 100) * 0.22);
    fogRef.current = fog;
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 3.8);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current || undefined,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (rendererErr: any) {
      const msg = rendererErr?.message || 'WebGL initialization failed.';
      console.error('[ARAVAN] WebGL renderer error:', msg);
      stateManager.updateGlowDiagnostics({
        rendererStatus: 'error',
        lastSyncError: msg,
      });
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // 2. Post-processing Bloom Setup (UnrealBloomPass)
    let composer: EffectComposer | null = null;
    let rendererStatus: 'active' | 'fallback' = 'active';
    try {
      const renderPass = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        1.25,
        0.45,
        0.18
      );
      bloomPassRef.current = bloomPass;
      const outputPass = new OutputPass();

      composer = new EffectComposer(renderer);
      composer.addPass(renderPass);
      composer.addPass(bloomPass);
      composer.addPass(outputPass);
    } catch (bloomErr: any) {
      console.warn('[ARAVAN] Bloom post-processing unavailable, falling back to direct render:', bloomErr);
      composer = null;
      bloomPassRef.current = null;
      rendererStatus = 'fallback';
    }

    stateManager.updateGlowDiagnostics({
      rendererStatus,
      lastSyncError: null,
    });

    // 3. Cybernetic Lighting
    const ambientLight = new THREE.AmbientLight(new THREE.Color(currentTheme.accent), 0.45);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(2, 4, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(new THREE.Color(currentTheme.secondary), 1.6);
    rimLight.position.set(-3, -2, -2);
    rimLightRef.current = rimLight;
    scene.add(rimLight);

    // 4. Cyberspace 3D Hologram Emitter Grid & Floor Rings
    const emitterGroup = new THREE.Group();
    emitterGroup.position.set(0, -1.5, 0);

    const ringGeo1 = new THREE.RingGeometry(1.6, 1.65, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: new THREE.Color(currentTheme.accent),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    ringMat1Ref.current = ringMat1;
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI / 2;
    emitterGroup.add(ringMesh1);

    const ringGeo2 = new THREE.RingGeometry(0.9, 0.94, 48);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: new THREE.Color(currentTheme.secondary),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    ringMat2Ref.current = ringMat2;
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = Math.PI / 2;
    emitterGroup.add(ringMesh2);

    const floorGrid = new THREE.GridHelper(
      10,
      24,
      new THREE.Color(currentTheme.accent),
      new THREE.Color(0x181030)
    );
    floorGrid.position.set(0, -0.02, 0);
    (floorGrid.material as THREE.Material).transparent = true;
    (floorGrid.material as THREE.Material).opacity = 0.35;
    (floorGrid.material as THREE.Material).blending = THREE.AdditiveBlending;
    floorGridRef.current = floorGrid;
    emitterGroup.add(floorGrid);
    scene.add(emitterGroup);

    // 5. 3D Cyberspace Particle Cloud (pre-allocated buffer with dynamic drawRange)
    const particleGeo = new THREE.BufferGeometry();
    particleGeoRef.current = particleGeo;
    const particlePos = new Float32Array(MAX_PARTICLES * 3);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 8;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setDrawRange(0, Math.round((controlsRef.current.particles / 100) * MAX_PARTICLES));

    const particleMat = new THREE.PointsMaterial({
      color: new THREE.Color(currentTheme.accent),
      size: 0.035,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    particleMatRef.current = particleMat;
    const particleCloud = new THREE.Points(particleGeo, particleMat);
    scene.add(particleCloud);

    // 5b. Interactive Cosmic Spiral Galaxy Backdrop
    const galaxyGroup = new THREE.Group();
    galaxyGroup.position.set(0, 0.22, -1.9);
    galaxyGroup.rotation.x = 0.52;
    galaxyGroup.rotation.y = -0.22;
    galaxyGroupRef.current = galaxyGroup;

    const galaxyParams = {
      count: 900,
      branches: 3,
      radius: 3.2,
      spin: 1.15,
      randomness: 0.26,
      power: 3.0,
    };

    const galaxyGeo = new THREE.BufferGeometry();
    const galaxyPositions = new Float32Array(galaxyParams.count * 3);
    const galaxyColors = new Float32Array(galaxyParams.count * 3);

    const insideColor = new THREE.Color(currentTheme.accent);
    const outsideColor = new THREE.Color(currentTheme.secondary);
    const starCoreColor = new THREE.Color(0xffffff);

    for (let i = 0; i < galaxyParams.count; i++) {
      const r = Math.pow(Math.random(), galaxyParams.power) * galaxyParams.radius;
      const spinAngle = r * galaxyParams.spin;
      const branchAngle = ((i % galaxyParams.branches) / galaxyParams.branches) * Math.PI * 2;

      const randomX = (Math.pow(Math.random(), 2) - 0.5) * galaxyParams.randomness * r;
      const randomY = (Math.pow(Math.random(), 2) - 0.5) * galaxyParams.randomness * r * 0.4;
      const randomZ = (Math.pow(Math.random(), 2) - 0.5) * galaxyParams.randomness * r;

      galaxyPositions[i * 3] = Math.cos(branchAngle + spinAngle) * r + randomX;
      galaxyPositions[i * 3 + 1] = randomY;
      galaxyPositions[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

      const mixedColor = insideColor.clone();
      mixedColor.lerp(outsideColor, r / galaxyParams.radius);
      if (r < 0.6) {
        mixedColor.lerp(starCoreColor, 1 - r / 0.6);
      }

      galaxyColors[i * 3] = mixedColor.r;
      galaxyColors[i * 3 + 1] = mixedColor.g;
      galaxyColors[i * 3 + 2] = mixedColor.b;
    }

    galaxyGeo.setAttribute('position', new THREE.BufferAttribute(galaxyPositions, 3));
    galaxyGeo.setAttribute('color', new THREE.BufferAttribute(galaxyColors, 3));
    galaxyGeoRef.current = galaxyGeo;

    const starCanvas = document.createElement('canvas');
    starCanvas.width = 32;
    starCanvas.height = 32;
    const starCtx = starCanvas.getContext('2d')!;
    const starGrad = starCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    starGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    starGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.7)');
    starGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
    starGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    starCtx.fillStyle = starGrad;
    starCtx.fillRect(0, 0, 32, 32);
    const starTexture = new THREE.CanvasTexture(starCanvas);

    const galaxyMat = new THREE.PointsMaterial({
      size: 0.052,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      map: starTexture,
      transparent: true,
      opacity: 0.62,
    });
    galaxyMatRef.current = galaxyMat;

    const galaxyPoints = new THREE.Points(galaxyGeo, galaxyMat);
    galaxyGroup.add(galaxyPoints);

    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 64;
    haloCanvas.height = 64;
    const haloCtx = haloCanvas.getContext('2d')!;
    const haloGrad = haloCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    haloGrad.addColorStop(0, currentTheme.accent);
    haloGrad.addColorStop(0.4, currentTheme.secondary);
    haloGrad.addColorStop(1, 'transparent');
    haloCtx.fillStyle = haloGrad;
    haloCtx.fillRect(0, 0, 64, 64);
    const haloTex = new THREE.CanvasTexture(haloCanvas);
    coreHaloTexRef.current = haloTex;

    const coreHaloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    coreHaloMatRef.current = coreHaloMat;
    const coreHaloGeo = new THREE.PlaneGeometry(1.4, 1.4);
    const coreHaloMesh = new THREE.Mesh(coreHaloGeo, coreHaloMat);
    galaxyGroup.add(coreHaloMesh);

    scene.add(galaxyGroup);

    // 6. Build 3D Holographic ARAVAN Skull
    const skullParts = buildARAVANSkull(currentTheme.accent, currentTheme.secondary);
    partsRef.current = skullParts;
    scene.add(skullParts.skullGroup);

    // Apply initial visual controls cleanly once skull parts are built
    applyThemeToSkull(skullParts, currentTheme, {
      cyan: controlsRef.current.colorMix.cyan,
      purple: controlsRef.current.colorMix.purple,
      blue: controlsRef.current.colorMix.blue,
      magenta: controlsRef.current.colorMix.magenta,
      cyanEnergy: controlsRef.current.cyanEnergy,
      purpleEnergy: controlsRef.current.purpleEnergy,
    });

    // Mouse / Touch Interaction & Organic Damping Variables
    let targetRotationX = 0;
    let targetRotationY = 0;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;
    let targetCameraZ = 3.8;
    let mouseX = 0;
    let mouseY = 0;
    let isDragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const rect = container.getBoundingClientRect();

      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);

      mouseX = nx;
      mouseY = ny;

      if (isDragging) {
        const deltaX = clientX - prevPointerX;
        const deltaY = clientY - prevPointerY;
        dragOffsetY += deltaX * 0.008;
        dragOffsetX += deltaY * 0.008;
        dragOffsetX = Math.max(-0.6, Math.min(0.6, dragOffsetX));
      }

      prevPointerX = clientX;
      prevPointerY = clientY;
    };

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      prevPointerX = clientX;
      prevPointerY = clientY;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetCameraZ += e.deltaY * 0.0025;
      targetCameraZ = Math.max(2.2, Math.min(5.5, targetCameraZ));
    };

    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchmove', onPointerMove, { passive: true });
    container.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    const audioReactive = AudioReactiveCore.getInstance();
    const freqData = new Uint8Array(64);

    let animationId: number;
    const clock = new THREE.Clock();
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let lastHudUpdateTime = 0;
    let lastReportedJaw = -1;
    let lastReportedLoad = -1;
    let lastReportedFreq = -1;
    let currentJawRotation = 0;
    let swirlPhase = 0;
    let ringPhase = 0;
    let brainPhase = 0;
    let fogPhase = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      frameCount++;
      const now = performance.now();
      if (now - lastFpsTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsTime)));
        frameCount = 0;
        lastFpsTime = now;
      }

      const ctrl = controlsRef.current;
      const masterNorm = ctrl.masterGlow / 100;
      const eyeNorm = ctrl.eyeGlow / 100;
      const electricNorm = ctrl.electricGlow / 100;
      const purpleNorm = ctrl.purpleEnergy / 100;
      const cyanNorm = ctrl.cyanEnergy / 100;
      const fogNorm = ctrl.fog / 100;
      const particlesNorm = ctrl.particles / 100;
      const bloomNorm = ctrl.bloom / 100;
      const talkingGlowNorm = ctrl.talkingGlow / 100;
      const energySpeedNorm = ctrl.energySpeed / 100;
      const lightningSpeedNorm = ctrl.lightningSpeed / 100;
      const fogSpeedNorm = ctrl.fogSpeed / 100;
      const particleSpeedNorm = ctrl.particleSpeed / 100;
      const talkingReactNorm = ctrl.talkingReactivity / 100;
      const cursorFollowNorm = ctrl.cursorFollowStrength / 100;

      // 1. Live Cursor Follow + Drag Orbit Damping
      // Updates immediately even when user drags the Cursor Follow Strength slider!
      targetRotationY = dragOffsetY + mouseX * 0.55 * cursorFollowNorm;
      targetRotationX = Math.max(-0.6, Math.min(0.6, dragOffsetX - mouseY * 0.42 * cursorFollowNorm));

      currentRotationY += (targetRotationY - currentRotationY) * 0.08;
      currentRotationX += (targetRotationX - currentRotationX) * 0.08;
      camera.position.z += (targetCameraZ - camera.position.z) * 0.08;

      const {
        skullGroup,
        jawBone,
        brainGroup,
        leftEye,
        rightEye,
        foreheadSwirl,
        brainCoreLight,
      } = skullParts;
      const { voiceState: vs, micVolume: mv, speakerVolume: sv } = stateRef.current;

      const isAudioActuallyPlaying = audioReactive.getIsSpeaking();
      const isSpeaking = vs === 'speaking' || isAudioActuallyPlaying;
      const isListening = vs === 'listening';
      const isThinking = vs === 'thinking';

      // 2. Real Web Audio Frequency & Amplitude Analysis
      audioReactive.getFrequencyData(freqData);
      let realAudioVol = 0;
      for (let i = 0; i < freqData.length; i++) {
        realAudioVol += freqData[i];
      }
      realAudioVol = realAudioVol / (freqData.length * 255);

      const activeVolume = Math.max(
        realAudioVol,
        isSpeaking ? sv : isListening ? mv * 0.8 : 0
      );

      // 3. Audio-Reactive TMJ Mandible Jaw Movement (scaled cleanly 0-100% by talkingReactivity)
      let targetJawX = 0;
      if (isSpeaking && jawBone) {
        targetJawX = (0.12 + activeVolume * 0.58) * (talkingReactNorm / 0.8);
      } else if (isListening && jawBone) {
        targetJawX = (0.03 + activeVolume * 0.14) * (talkingReactNorm / 0.8);
      }

      currentJawRotation += (targetJawX - currentJawRotation) * 0.28;
      if (jawBone) {
        jawBone.rotation.x = currentJawRotation;
      }

      // Accumulate smooth speed phases so changing speed sliders never jumps backward
      brainPhase += delta * (0.35 + energySpeedNorm * 4.2);
      swirlPhase += delta * (0.15 + energySpeedNorm * 1.4);
      ringPhase += delta * (0.08 + lightningSpeedNorm * 0.95);
      fogPhase += delta * (0.1 + fogSpeedNorm * 2.2);

      // 4. Organic Skull Idle Breathing & Motion
      const idleFloatY = Math.sin(elapsedTime * 1.6) * 0.045;
      const idleRollZ = Math.sin(elapsedTime * 0.9) * 0.025;
      const speechNod = isSpeaking ? Math.sin(elapsedTime * 9.0) * 0.035 * activeVolume : 0;

      skullGroup.rotation.y = currentRotationY;
      skullGroup.rotation.x = currentRotationX + speechNod;
      skullGroup.rotation.z = idleRollZ;
      skullGroup.position.y = idleFloatY;

      // 5. Cranium Scale Pulse
      const pulseScale = 1.0 + activeVolume * 0.045 * talkingReactNorm;
      skullGroup.scale.set(pulseScale, pulseScale, pulseScale);

      // 6. Eye Gaze Tracking + Eye Glow Scaling
      if (leftEye && rightEye) {
        const eyeLookX = -mouseY * 0.22 * cursorFollowNorm;
        const eyeLookY = mouseX * 0.25 * cursorFollowNorm;
        leftEye.rotation.x += (eyeLookX - leftEye.rotation.x) * 0.12;
        leftEye.rotation.y += (eyeLookY - leftEye.rotation.y) * 0.12;
        rightEye.rotation.x += (eyeLookX - rightEye.rotation.x) * 0.12;
        rightEye.rotation.y += (eyeLookY - rightEye.rotation.y) * 0.12;
      }

      const eyeTalkingBoost = isSpeaking ? activeVolume * 1.8 * talkingGlowNorm : 0;
      const eyeIntensity = eyeNorm * 2.1 * (0.5 + masterNorm * 0.6) + eyeTalkingBoost;
      if (skullParts.leftEyeLight) skullParts.leftEyeLight.intensity = eyeIntensity;
      if (skullParts.rightEyeLight) skullParts.rightEyeLight.intensity = eyeIntensity;

      // 7. Internal Neural Brain & Forehead Swirl (Purple Energy + Cyan Energy + Talking Glow)
      if (brainGroup) {
        const brainScale =
          1.0 + Math.sin(brainPhase) * (0.015 + purpleNorm * 0.025) + activeVolume * 0.08;
        brainGroup.scale.set(brainScale, brainScale, brainScale);
      }

      if (brainCoreLight) {
        const energyMix = 0.35 + purpleNorm * 0.65 + cyanNorm * 0.35;
        const talkBoost = isSpeaking ? activeVolume * 4.5 * talkingGlowNorm : 0;
        const baseGlow = masterNorm * 2.8 * energyMix;
        brainCoreLight.intensity =
          masterNorm <= 0.01 && talkBoost <= 0.01
            ? 0
            : Math.max(0, baseGlow + talkBoost + Math.sin(brainPhase * 2.2) * 0.25 * masterNorm);
      }

      if (foreheadSwirl) {
        foreheadSwirl.rotation.z = swirlPhase;
        const swirlTargetOpacity =
          isSpeaking || isThinking
            ? Math.min(0.95, (0.25 + activeVolume * 0.65) * Math.max(cyanNorm, talkingGlowNorm))
            : Math.min(0.45, cyanNorm * masterNorm * 0.35);
        skullParts.materials.swirl.opacity +=
          (swirlTargetOpacity - skullParts.materials.swirl.opacity) * 0.12;
      }

      // Dynamic Fissure Lightning Shimmer
      if (skullParts.materials.fissures) {
        const shimmer =
          lightningSpeedNorm > 0.02
            ? 0.85 + Math.sin(elapsedTime * (2 + lightningSpeedNorm * 12)) * 0.15
            : 1.0;
        skullParts.materials.fissures.opacity = Math.min(
          1.0,
          electricNorm * (0.55 + cyanNorm * 0.65) * shimmer
        );
      }

      // 8. Dynamic Atmospheric Fog Breathing (fog & fogSpeed sliders)
      if (fogRef.current) {
        const fogWave = fogSpeedNorm > 0.01 ? 1 + Math.sin(fogPhase) * 0.18 : 1;
        fogRef.current.density = fogNorm * 0.22 * fogWave;
      }

      // 9. Dynamic Bloom Strength & Threshold (bloom + talkingGlow sliders)
      if (bloomPassRef.current) {
        const talkBloomBoost = isSpeaking ? activeVolume * 0.65 * talkingGlowNorm : 0;
        const targetBloom =
          bloomNorm <= 0.01 ? 0 : bloomNorm * 2.2 * (0.45 + masterNorm * 0.55) + talkBloomBoost;
        bloomPassRef.current.strength += (targetBloom - bloomPassRef.current.strength) * 0.15;
        bloomPassRef.current.radius = 0.22 + bloomNorm * 0.45;
      }

      // 10. Rotate Floor Holo Rings
      ringMesh1.rotation.z = ringPhase;
      ringMesh2.rotation.z = -ringPhase * 1.45;

      // 10b. Cosmic Galaxy Parallax & Rotation
      if (galaxyGroup) {
        galaxyGroup.rotation.z += delta * (0.01 + energySpeedNorm * 0.05);
        galaxyGroup.rotation.y =
          -0.22 + Math.sin(elapsedTime * 0.4) * 0.03 + currentRotationY * 0.16;
        galaxyGroup.rotation.x =
          0.52 - Math.cos(elapsedTime * 0.3) * 0.02 + currentRotationX * 0.12;
        const gPulse = 1.0 + activeVolume * 0.045;
        galaxyGroup.scale.set(gPulse, gPulse, gPulse);
        if (coreHaloMatRef.current) {
          coreHaloMatRef.current.opacity =
            0.12 +
            masterNorm * 0.24 +
            activeVolume * 0.22 * talkingGlowNorm +
            Math.sin(elapsedTime * 2.5) * 0.04;
        }
      }

      // 11. Drift 3D Particle Cloud (active slice driven by particles & particleSpeed)
      const activeParticleCount = Math.round(particlesNorm * MAX_PARTICLES);
      if (activeParticleCount > 0 && particleSpeedNorm > 0.005) {
        const pAttr = particleGeo.attributes.position;
        const pArr = pAttr.array as Float32Array;
        const driftStep = delta * (0.12 + particleSpeedNorm * 1.15) * (1 + activeVolume * 1.5);
        for (let i = 0; i < activeParticleCount; i++) {
          pArr[i * 3 + 1] += driftStep;
          if (pArr[i * 3 + 1] > 3) {
            pArr[i * 3 + 1] = -3;
          }
        }
        pAttr.needsUpdate = true;
      }

      // 12. Throttled Telemetry HUD Updates (~5Hz max, only if values changed!)
      if (now - lastHudUpdateTime >= 200) {
        lastHudUpdateTime = now;
        const nextJaw = Math.round((currentJawRotation * 180) / Math.PI);
        if (nextJaw !== lastReportedJaw) {
          lastReportedJaw = nextJaw;
          setJawAngleDeg(nextJaw);
        }

        const glowBoost = Math.round((masterNorm - 0.5) * 35);
        const nextLoad = Math.min(
          100,
          Math.max(10, Math.round(35 + activeVolume * 55 + glowBoost + (isSpeaking ? 10 : isListening ? 6 : 0)))
        );
        if (Math.abs(nextLoad - lastReportedLoad) >= 1) {
          lastReportedLoad = nextLoad;
          setNeuralLoad(nextLoad);
          const nextFreq = parseFloat((4.2 + (nextLoad / 100) * 1.8).toFixed(2));
          if (nextFreq !== lastReportedFreq) {
            lastReportedFreq = nextFreq;
            setSynapseFreq(nextFreq);
          }
        }
      }

      // 13. Render Scene
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    animate();

    // Window Resize Handling
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 600;
      height = container.clientHeight || 520;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      if (composer) {
        composer.setSize(width, height);
      }
      if (bloomPassRef.current) {
        bloomPassRef.current.resolution.set(width, height);
      }
    };
    window.addEventListener('resize', handleResize);

    // Clean GPU Resource Disposal on Unmount
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchmove', onPointerMove);
      container.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchend', onPointerUp);

      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        const mat = (mesh as any).material;
        if (mat) {
          const materials = Array.isArray(mat) ? mat : [mat];
          for (const m of materials) {
            if (m?.map) m.map.dispose();
            m?.dispose?.();
          }
        }
      });

      starTexture.dispose();
      if (coreHaloTexRef.current) {
        coreHaloTexRef.current.dispose();
        coreHaloTexRef.current = null;
      }
      bloomPassRef.current?.dispose?.();
      composer?.dispose?.();
      renderer.dispose();
      scene.clear();

      partsRef.current = null;
      sceneRef.current = null;
      fogRef.current = null;
      bloomPassRef.current = null;

      stateManager.updateGlowDiagnostics({
        rendererStatus: 'disposed',
      });
    };
  }, []);

  // Voice State Helpers
  const isConnecting = voiceState === 'connecting';
  const isListening = voiceState === 'listening';
  const isSpeaking = voiceState === 'speaking';
  const isError = voiceState === 'error';

  return (
    <div
      ref={mountRef}
      className="relative w-full h-[380px] sm:h-[460px] lg:h-[500px] xl:h-[540px] rounded-2xl overflow-hidden border border-zinc-800/80 bg-gradient-to-b from-[#090616]/90 via-[#05030d]/95 to-[#060412]/90 shadow-2xl select-none flex items-center justify-center group"
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Cybernetic Scanlines Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.35)_51%)] bg-[size:100%_4px] opacity-40" />

      {/* HUD Corner Accents */}
      <div
        className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 pointer-events-none transition-colors duration-500"
        style={{ borderColor: currentTheme.accent }}
      />
      <div
        className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 pointer-events-none transition-colors duration-500"
        style={{ borderColor: currentTheme.accent }}
      />
      <div
        className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 pointer-events-none transition-colors duration-500"
        style={{ borderColor: currentTheme.accent }}
      />
      <div
        className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 pointer-events-none transition-colors duration-500"
        style={{ borderColor: currentTheme.accent }}
      />

      {/* TOP LEFT: Voice State & Echo Shield Badge */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md shadow-lg">
          <div
            className="w-2.5 h-2.5 rounded-full animate-pulse transition-colors duration-500"
            style={{
              backgroundColor: isSpeaking
                ? '#C026FF'
                : isListening
                ? currentTheme.accent
                : isConnecting
                ? '#F59E0B'
                : '#71717A',
            }}
          />
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              VOICE STATE
            </span>
            <span
              className="text-xs font-mono font-bold tracking-widest uppercase transition-colors"
              style={{
                color: isSpeaking
                  ? '#E052FF'
                  : isListening
                  ? currentTheme.accent
                  : isConnecting
                  ? '#FBBF24'
                  : '#A1A1AA',
              }}
            >
              {isSpeaking
                ? 'VOCALIZING'
                : isListening
                ? 'LISTENING'
                : isConnecting
                ? 'SYNCING'
                : isError
                ? 'ERROR'
                : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Live Audio Reactive Mandible TMJ Angle & Echo Shield Telemetry */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-950/75 border border-zinc-900 backdrop-blur-md text-[10px] font-mono text-zinc-400">
          <span className="text-zinc-500">TMJ JAW:</span>
          <span className="text-white font-semibold">{jawAngleDeg}°</span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-500">FPS:</span>
          <span className="text-emerald-400 font-semibold">{fps}</span>
          <span className="text-zinc-500">|</span>
          <span className={stopListeningWhileSpeaking ? 'text-cyan-400' : 'text-amber-400'}>
            {stopListeningWhileSpeaking ? 'SHIELD: ON' : 'SHIELD: OFF'}
          </span>
        </div>
      </div>

      {/* TOP RIGHT: Telemetry & Shading Mode */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Compact Glow & Shading Bar */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md shadow-xl text-[10px] font-mono">
          <div className="flex items-center gap-1 px-1.5 py-0.5 text-zinc-400">
            <Sparkles className="w-3 h-3" style={{ color: currentTheme.accent }} />
            <span className="uppercase font-bold" style={{ color: currentTheme.accent }}>
              {controls.preset}
            </span>
          </div>
          <div className="w-[1px] h-3.5 bg-zinc-800" />
          <button
            onClick={() => setRenderMode('wireframe')}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              renderMode === 'wireframe'
                ? 'bg-zinc-800 text-white font-bold border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            WIRE
          </button>
          <button
            onClick={() => setRenderMode('points')}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              renderMode === 'points'
                ? 'bg-zinc-800 text-white font-bold border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            POINTS
          </button>
          <button
            onClick={() => setRenderMode('shaded')}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              renderMode === 'shaded'
                ? 'bg-zinc-800 text-white font-bold border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            SHADED
          </button>
        </div>

        {/* Neural Brain Activity Telemetry Card */}
        <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md shadow-lg text-right flex flex-col gap-1 w-44">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="flex items-center gap-1 text-zinc-400">
              <Cpu className="w-3 h-3 text-cyan-400" />
              NEURAL BRAIN
            </span>
            <span className="font-bold font-mono text-[11px]" style={{ color: currentTheme.accent }}>
              {neuralLoad}%
            </span>
          </div>

          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${neuralLoad}%`,
                backgroundColor: currentTheme.accent,
                boxShadow: `0 0 8px ${currentTheme.accent}`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-0.5">
            <span>SYNAPSE: {synapseFreq} GHz</span>
            <span className="text-zinc-400">64 NODES</span>
          </div>
        </div>
      </div>

      {/* BOTTOM LEFT: AI CORE SPECS */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex flex-col gap-1 pointer-events-auto">
        <div className="px-3 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md text-[10px] font-mono text-zinc-400 flex flex-col gap-0.5">
          <div className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            AI CORE SPECS
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">VOICE:</span>
            <span className="text-zinc-200 font-semibold">ARAVAN (Charon)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">MODEL:</span>
            <span className="text-cyan-400 font-semibold">Gemini Live</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-500">SPEECH ECHO-MUTE:</span>
            <span className={stopListeningWhileSpeaking ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
              {stopListeningWhileSpeaking ? 'ACTIVE' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT: Interaction Guide */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-950/70 border border-zinc-900 text-[9px] font-mono text-zinc-500 backdrop-blur-sm">
          <span>DRAG TO ORBIT</span>
          <span className="text-zinc-600">•</span>
          <span>SCROLL TO ZOOM</span>
        </div>
      </div>

      {/* Central Watermark Overlay */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none text-center">
        <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-600/60 font-extrabold">
          ARAVAN HOLOGRAPHIC CORE v4.2
        </span>
      </div>
    </div>
  );
};
