/**
 * ARAVAN — Frozen Orientation Holographic Skull Visual Core
 * 
 * STRICT USER INSTRUCTION:
 * - Removed all event listeners (mouse and touch) from SkullRoot reference.
 * - Removed all cursor-following logic from SkullRoot.
 * - Skull maintains its current visual state without reacting to mouse or touch inputs.
 * - Effectively freezes orientation facing forward, rock-solid.
 * - Real Gemini Live audio-reactive speech lighting and orbital rings are preserved.
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { VoiceState } from '../types';
import { useTheme } from '../context/ThemeContext';
import skullImage from '../assets/images/aravan_skull_core_1790922135848.jpg';

interface ThreeSkullSceneProps {
  voiceState: VoiceState;
  micVolume: number;
  speakerVolume: number;
  getAudioAnalyser?: () => AnalyserNode | null;
  isPlaying?: boolean;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
  onDebugUpdate?: (debugData: SkullDebugData) => void;
}

export interface SkullDebugData {
  cursorX: number;
  cursorY: number;
  targetYaw: number;
  targetPitch: number;
  currentYaw: number;
  currentPitch: number;
  skullRootStatus: string;
  webGLStatus: string;
  aravanState: VoiceState;
  audioLevel: number;
}

export const ThreeSkullScene: React.FC<ThreeSkullSceneProps> = ({
  voiceState,
  micVolume,
  speakerVolume,
  getAudioAnalyser,
  isPlaying = false,
  onClick,
  onDebugUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { currentTheme } = useTheme();
  const [webGLAvailable, setWebGLAvailable] = useState<boolean>(true);

  // Decoupled runtime state ref
  const stateRef = useRef({
    voiceState,
    micVolume,
    speakerVolume,
    isPlaying,
    themeAccent: currentTheme.accent,
    themeSecondary: currentTheme.secondary,
    // Audio Analyser & Animation states
    audioAmplitude: 0,
    mouthGlow: 0,
    vortexOpacity: 0,
    electricOpacity: 0.45,
    clickPulse: 0,
  });

  // Keep stateRef in sync with React props
  useEffect(() => {
    stateRef.current.voiceState = voiceState;
    stateRef.current.micVolume = micVolume;
    stateRef.current.speakerVolume = speakerVolume;
    stateRef.current.isPlaying = isPlaying;
    stateRef.current.themeAccent = currentTheme.accent;
    stateRef.current.themeSecondary = currentTheme.secondary;
  }, [voiceState, micVolume, speakerVolume, isPlaying, currentTheme]);

  const handleClick = () => {
    stateRef.current.clickPulse = 1.0;
    if (onClick) onClick();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Verify WebGL Support
    let isWebGLSupported = false;
    try {
      const testCanvas = document.createElement('canvas');
      isWebGLSupported = !!(
        window.WebGLRenderingContext &&
        (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'))
      );
    } catch {
      isWebGLSupported = false;
    }

    if (!isWebGLSupported) {
      setWebGLAvailable(false);
      return;
    }

    const width = container.clientWidth || 460;
    const height = container.clientHeight || 460;

    // Single static scene, fixed camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05030d, 0.12);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0, 5.0); // Fixed camera

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('[ARAVAN] WebGL initialization failed:', e);
      setWebGLAvailable(false);
      return;
    }

    // High-res texture loading (cached once)
    const textureLoader = new THREE.TextureLoader();
    const referenceTexture = textureLoader.load(skullImage);
    referenceTexture.colorSpace = THREE.SRGBColorSpace;
    referenceTexture.minFilter = THREE.LinearFilter;
    referenceTexture.magFilter = THREE.LinearFilter;

    // =============================================================
    // PERMANENTLY LOCKED ORIENTATION: SkullRoot maintains fixed state
    // matrixAutoUpdate is disabled so Three.js freezes the transform matrix
    // =============================================================
    const skullRoot = new THREE.Group();
    skullRoot.position.set(0, 0, 0);
    skullRoot.rotation.set(0, 0, 0);
    skullRoot.scale.set(1, 1, 1);
    skullRoot.updateMatrix();
    skullRoot.matrixAutoUpdate = false;
    scene.add(skullRoot);

    const accentColor = new THREE.Color(currentTheme.accent);
    const secondaryColor = new THREE.Color(currentTheme.secondary);
    const magentaColor = new THREE.Color('#C026FF');

    // Background Purple Atmosphere Fog
    const smokeGeo = new THREE.PlaneGeometry(6.8, 6.8);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0x1e0533,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const smokeMesh = new THREE.Mesh(smokeGeo, smokeMat);
    smokeMesh.position.set(0, 0, -0.8);
    scene.add(smokeMesh);

    // Stable Holographic Skull Plane (Exact reference visual)
    const skullGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const skullMat = new THREE.MeshBasicMaterial({
      map: referenceTexture,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });
    const skullMesh = new THREE.Mesh(skullGeo, skullMat);
    skullMesh.position.set(0, 0, 0.0);
    skullRoot.add(skullMesh);

    // Cyan Holographic Edge Glow Accent
    const edgeMat = new THREE.MeshBasicMaterial({
      map: referenceTexture,
      color: accentColor,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const edgeMesh = new THREE.Mesh(skullGeo, edgeMat);
    edgeMesh.position.set(0, 0, 0.01);
    skullRoot.add(edgeMesh);

    // Subtle Mouth / Jaw Energy (Talking)
    const mouthGeo = new THREE.PlaneGeometry(1.4, 0.6);
    const mouthMat = new THREE.MeshBasicMaterial({
      map: referenceTexture,
      color: 0x00ffff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.position.set(0, -0.56, 0.02);
    skullRoot.add(mouthMesh);

    // Forehead Thinking Spiral Vortex
    const vortexGroup = new THREE.Group();
    vortexGroup.position.set(0, 0.72, 0.03);
    skullRoot.add(vortexGroup);

    const spiralCount = 70;
    const spiralGeo = new THREE.BufferGeometry();
    const spiralPos = new Float32Array(spiralCount * 3);
    for (let s = 0; s < spiralCount; s++) {
      const t = s / spiralCount;
      const angle = t * Math.PI * 4.5;
      const r = t * 0.38;
      spiralPos[s * 3] = Math.cos(angle) * r;
      spiralPos[s * 3 + 1] = Math.sin(angle) * r;
      spiralPos[s * 3 + 2] = 0;
    }
    spiralGeo.setAttribute('position', new THREE.BufferAttribute(spiralPos, 3));

    const spiralMat = new THREE.PointsMaterial({
      color: magentaColor,
      size: 0.05,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const spiralPoints = new THREE.Points(spiralGeo, spiralMat);
    vortexGroup.add(spiralPoints);

    // Eye Illumination (Locked inside eye sockets)
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(0, 0, 0.04);

    const eyeGlowGeo = new THREE.RingGeometry(0.04, 0.16, 24);
    const eyeGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const leftEye = new THREE.Mesh(eyeGlowGeo, eyeGlowMat);
    const rightEye = new THREE.Mesh(eyeGlowGeo, eyeGlowMat);
    leftEye.position.set(-0.46, 0.18, 0);
    rightEye.position.set(0.46, 0.18, 0);
    eyeGroup.add(leftEye);
    eyeGroup.add(rightEye);
    skullRoot.add(eyeGroup);

    const eyeLight = new THREE.PointLight(accentColor, 1.8, 4.0);
    eyeLight.position.set(0, 0.2, 0.8);
    skullRoot.add(eyeLight);

    // Surface Electric Veins / Cracks
    const crackGroup = new THREE.Group();
    crackGroup.position.set(0, 0, 0.03);
    skullRoot.add(crackGroup);

    const crackMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const staticCrackPaths = [
      [[-0.1, 1.25], [-0.3, 0.95], [-0.5, 0.72], [-0.62, 0.42]],
      [[0.1, 1.25], [0.35, 0.98], [0.55, 0.68], [0.64, 0.38]],
      [[-0.05, 0.62], [0.0, 0.32], [0.15, 0.12], [0.0, -0.15]],
      [[-0.42, 0.52], [-0.26, 0.32], [-0.15, 0.16]],
      [[0.42, 0.52], [0.26, 0.32], [0.15, 0.16]],
    ];

    staticCrackPaths.forEach((path) => {
      const pts: THREE.Vector3[] = [];
      path.forEach(([x, y]) => pts.push(new THREE.Vector3(x, y, 0)));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, crackMat);
      crackGroup.add(line);
    });

    // Concentric Orbital Data Rings
    const ring1Geo = new THREE.TorusGeometry(1.95, 0.012, 16, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const orbitalRing1 = new THREE.Mesh(ring1Geo, ring1Mat);
    orbitalRing1.rotation.x = Math.PI / 2.2;
    skullRoot.add(orbitalRing1);

    const ring2Geo = new THREE.TorusGeometry(2.2, 0.01, 16, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: secondaryColor,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const orbitalRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
    orbitalRing2.rotation.x = Math.PI / 4;
    orbitalRing2.rotation.y = Math.PI / 8;
    skullRoot.add(orbitalRing2);

    // Shockwave Ring on Click
    const shockwaveGeo = new THREE.RingGeometry(0.25, 0.32, 48);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: accentColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shockwave = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwave.position.set(0, 0, 0.05);
    skullRoot.add(shockwave);

    // Ambient Quantum Particles
    const particleCount = 65;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const baseRadii = new Float32Array(particleCount);

    for (let p = 0; p < particleCount; p++) {
      const radius = 1.5 + Math.random() * 1.5;
      baseRadii[p] = radius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      particlePositions[p * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[p * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[p * 3 + 2] = radius * Math.cos(phi) * 0.6;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: accentColor,
      size: 0.035,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Cinematic Lighting
    const keyLight = new THREE.PointLight(accentColor, 1.8, 8);
    keyLight.position.set(2.0, 2.5, 3.0);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(secondaryColor, 1.4, 7);
    fillLight.position.set(-2.0, -1.0, 2.5);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0x060412, 0.9);
    scene.add(ambientLight);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 460;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const freqDataBuffer = new Uint8Array(64);

    // =============================================================
    // RENDER LOOP — FROZEN ORIENTATION (ZERO CURSOR REACTION)
    // =============================================================
    let animId: number;
    let clock = new THREE.Clock();
    let debugTick = 0;

    const render = () => {
      animId = requestAnimationFrame(render);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      const state = stateRef.current;

      accentColor.set(state.themeAccent);
      secondaryColor.set(state.themeSecondary);
      edgeMat.color.copy(accentColor);
      ring1Mat.color.copy(accentColor);
      ring2Mat.color.copy(secondaryColor);
      particleMat.color.copy(accentColor);
      keyLight.color.copy(accentColor);
      fillLight.color.copy(secondaryColor);

      // Movement interpolation permanently disabled: SkullRoot is locked in place
      // Zero binding between mouse coordinates and SkullRoot rotation/position

      // Real Web Audio Analyser Integration
      const analyser = getAudioAnalyser ? getAudioAnalyser() : null;
      let rawAmplitude = 0;

      const isSpeaking = state.voiceState === 'speaking' || state.isPlaying;
      const isThinking = state.voiceState === 'thinking' || state.voiceState === 'connecting';
      const isListening = state.voiceState === 'listening';

      if (analyser && isSpeaking) {
        analyser.getByteFrequencyData(freqDataBuffer);
        let speechSum = 0;
        for (let b = 2; b < 20; b++) {
          speechSum += freqDataBuffer[b];
        }
        const speechAvg = speechSum / 18;
        if (speechAvg > 14) {
          rawAmplitude = Math.min(1.0, (speechAvg - 14) / 100.0);
        }
      } else if (isSpeaking) {
        rawAmplitude = Math.min(1.0, state.speakerVolume * 1.2);
      }

      state.audioAmplitude += (rawAmplitude - state.audioAmplitude) * 0.2;

      // Mouth Energy Illumination (Talking)
      const targetMouthGlow = isSpeaking ? state.audioAmplitude * 0.65 : 0.0;
      state.mouthGlow += (targetMouthGlow - state.mouthGlow) * 0.25;
      mouthMat.opacity = state.mouthGlow;

      // Forehead Thinking Spiral Vortex
      const targetVortex = isThinking ? 0.85 : 0.0;
      state.vortexOpacity += (targetVortex - state.vortexOpacity) * 0.1;

      if (state.vortexOpacity > 0.01) {
        vortexGroup.rotation.z -= delta * 6.0;
        spiralMat.opacity = state.vortexOpacity;
      } else {
        spiralMat.opacity = 0;
      }

      // Eye Glow Illumination
      if (isSpeaking) {
        eyeGlowMat.opacity = 0.75 + state.audioAmplitude * 0.25;
        eyeLight.intensity = 1.8 + state.audioAmplitude * 1.8;
      } else if (isListening) {
        eyeGlowMat.opacity = 0.7 + Math.sin(time * 4) * 0.15;
        eyeLight.intensity = 1.8;
      } else if (isThinking) {
        eyeGlowMat.opacity = 0.55;
        eyeLight.intensity = 1.4;
      } else {
        eyeGlowMat.opacity = 0.6;
        eyeLight.intensity = 1.3;
      }

      // Electric Veins & Edge Glow
      const targetElectric = isSpeaking ? 0.45 + state.audioAmplitude * 0.35 : 0.4;
      state.electricOpacity += (targetElectric - state.electricOpacity) * 0.15;
      crackMat.opacity = state.electricOpacity;

      // Orbital Rings
      orbitalRing1.rotation.z = time * 0.12;
      orbitalRing2.rotation.z = -time * 0.16;

      // Shockwave Ring
      if (state.clickPulse > 0.01) {
        shockwave.scale.set(1 + (1 - state.clickPulse) * 3.5, 1 + (1 - state.clickPulse) * 3.5, 1);
        shockwaveMat.opacity = state.clickPulse * 0.6;
        state.clickPulse -= delta * 1.8;
      } else {
        shockwaveMat.opacity = 0;
      }

      // Particles Orbit
      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      const orbitRate = isThinking ? 0.015 : isSpeaking ? 0.01 : 0.004;

      for (let p = 0; p < particleCount; p++) {
        const i3 = p * 3;
        const px = positions[i3];
        const pz = positions[i3 + 2];
        const currentAngle = Math.atan2(pz, px) + orbitRate;
        const dist = Math.sqrt(px * px + pz * pz);

        positions[i3] = Math.cos(currentAngle) * dist;
        positions[i3 + 2] = Math.sin(currentAngle) * dist;
        positions[i3 + 1] += Math.sin(time * 1.0 + p) * 0.001;
      }
      posAttr.needsUpdate = true;

      // Debug Telemetry Dispatch
      debugTick++;
      if (debugTick % 8 === 0 && onDebugUpdate) {
        onDebugUpdate({
          cursorX: 0,
          cursorY: 0,
          targetYaw: 0,
          targetPitch: 0,
          currentYaw: 0,
          currentPitch: 0,
          skullRootStatus: 'FROZEN ORIENTATION',
          webGLStatus: 'ACTIVE (60FPS)',
          aravanState: state.voiceState,
          audioLevel: parseFloat(state.audioAmplitude.toFixed(3)),
        });
      }

      renderer.render(scene, camera);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);

      smokeGeo.dispose();
      skullGeo.dispose();
      mouthGeo.dispose();
      spiralGeo.dispose();
      eyeGlowGeo.dispose();
      ring1Geo.dispose();
      ring2Geo.dispose();
      shockwaveGeo.dispose();
      particleGeo.dispose();

      smokeMat.dispose();
      skullMat.dispose();
      edgeMat.dispose();
      mouthMat.dispose();
      spiralMat.dispose();
      eyeGlowMat.dispose();
      crackMat.dispose();
      ring1Mat.dispose();
      ring2Mat.dispose();
      shockwaveMat.dispose();
      particleMat.dispose();
      referenceTexture.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [currentTheme.accent, currentTheme.secondary, getAudioAnalyser]);

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="relative w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] md:w-[460px] md:h-[460px] mx-auto flex items-center justify-center select-none"
    >
      {!webGLAvailable && (
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <img
            src={skullImage}
            alt="ARAVAN Holographic AI Core"
            className="w-full h-full object-contain filter drop-shadow-[0_0_25px_rgba(0,191,255,0.7)]"
          />
        </div>
      )}
    </div>
  );
};
