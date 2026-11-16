/**
 * SkullGeometryBuilder.ts - High-Fidelity Cyber Electric Skull
 * 
 * Modeled precisely after the reference video:
 * - Electric cyan & purple glowing translucent skull cranium
 * - Distinct red/magenta nasal bone bridge accent (#FF2A6D)
 * - Deep orbital eye sockets with glowing concentric vortex rings & pupil flares
 * - Forehead glowing neural swirl/spiral galaxy vortex (activates during processing/speech)
 * - Articulated TMJ lower mandible with defined upper/lower electric teeth
 * - Procedural cranial suture electric fissure lines
 */

import * as THREE from 'three';

export interface SkullParts {
  skullGroup: THREE.Group;
  craniumGroup: THREE.Group;
  jawBone: THREE.Group;
  brainGroup: THREE.Group;
  leftEye: THREE.Group;
  rightEye: THREE.Group;
  foreheadSwirl: THREE.Mesh;
  nasalBridgeAccent: THREE.Mesh;
  fissureLines: THREE.LineSegments;
  brainCoreLight: THREE.PointLight;
  leftEyeLight: THREE.PointLight;
  rightEyeLight: THREE.PointLight;
  craniumMesh: THREE.Mesh;
  craniumWireframe: THREE.LineSegments;
  craniumPoints: THREE.Points;
  jawMesh: THREE.Mesh;
  jawWireframe: THREE.LineSegments;
  jawPoints: THREE.Points;
  materials: {
    skullSurface: THREE.MeshStandardMaterial;
    wireframe: THREE.LineBasicMaterial;
    fissures: THREE.LineBasicMaterial;
    nasalBridge: THREE.MeshBasicMaterial;
    eyeIris: THREE.MeshBasicMaterial;
    eyeIrisRight: THREE.MeshBasicMaterial;
    eyeIrisInnerLeft: THREE.MeshBasicMaterial;
    eyeIrisInnerRight: THREE.MeshBasicMaterial;
    eyePupil: THREE.MeshBasicMaterial;
    eyePupilRight: THREE.MeshBasicMaterial;
    swirl: THREE.MeshBasicMaterial;
    teeth: THREE.MeshStandardMaterial;
    brain: THREE.MeshStandardMaterial;
    innerBrain: THREE.MeshStandardMaterial;
    cerebellum: THREE.MeshStandardMaterial;
    brainStem: THREE.MeshStandardMaterial;
    glowPoints: THREE.PointsMaterial;
  };
}

/**
 * Creates the organic cranial vault geometry
 */
function createCraniumGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1.22, 54, 46);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    const ny = v.y;
    const nz = v.z;
    const nx = v.x;

    // 1. Cranium Vault & Forehead
    if (ny > 0.35) {
      if (nz < 0) {
        v.x *= 1.15;
        v.z *= 1.08;
      } else {
        v.x *= 0.95;
        v.z *= 1.04;
        v.y *= 1.05;
      }
    }

    // 2. Temple Hollows
    if (ny > -0.05 && ny < 0.55 && Math.abs(nx) > 0.42 && nz > -0.2 && nz < 0.5) {
      v.x *= 0.85;
    }

    // 3. Supraorbital Brow Ridge
    if (ny > 0.22 && ny < 0.45 && nz > 0.68) {
      v.z += 0.20;
      v.y += 0.04;
    }

    // 4. Glabella depression
    if (Math.abs(v.x) < 0.16 && ny > 0.18 && ny < 0.38 && nz > 0.72) {
      v.z -= 0.08;
    }

    // 5. Deep Orbital Cavities (Eye Sockets)
    const eyeCenterYL = 0.16, eyeCenterZL = 0.82;
    const eyeDistL = Math.hypot(v.x - 0.46, v.y - eyeCenterYL, v.z - eyeCenterZL);
    const eyeDistR = Math.hypot(v.x + 0.46, v.y - eyeCenterYL, v.z - eyeCenterZL);

    if (eyeDistL < 0.36) {
      const f = (0.36 - eyeDistL) / 0.36;
      v.z -= f * 0.54;
      v.x += (v.x - 0.46) * f * 0.24;
      v.y += (v.y - eyeCenterYL) * f * 0.24;
    }
    if (eyeDistR < 0.36) {
      const f = (0.36 - eyeDistR) / 0.36;
      v.z -= f * 0.54;
      v.x += (v.x + 0.46) * f * 0.24;
      v.y += (v.y - eyeCenterYL) * f * 0.24;
    }

    // 6. Zygomatic Arches (Cheekbones)
    if (Math.abs(v.x) > 0.58 && v.y > -0.18 && v.y < 0.18 && v.z > 0.2 && v.z < 0.82) {
      v.x *= 1.25;
      v.z += 0.12;
      if (Math.abs(v.x) > 0.72 && v.y > -0.05 && v.z > 0.45) {
        v.z += 0.08;
      }
    }

    // 7. Sub-orbital cheek hollows
    if (Math.abs(v.x) > 0.28 && Math.abs(v.x) < 0.55 && v.y > -0.25 && v.y < 0.02 && v.z > 0.6) {
      v.z -= 0.12;
    }

    // 8. Piriform Aperture (Nasal Cavity Hollow)
    if (Math.abs(v.x) < 0.24 && v.y < 0.08 && v.y > -0.32 && v.z > 0.65) {
      const nDist = Math.hypot(v.x, v.y - -0.12);
      if (nDist < 0.26) {
        const nf = (0.26 - nDist) / 0.26;
        v.z -= nf * 0.55;
      }
    }

    // 9. Nasal Bone Bridge
    if (Math.abs(v.x) < 0.12 && v.y > -0.02 && v.y < 0.24 && v.z > 0.7) {
      v.z += 0.15;
    }

    // 10. Maxilla (Upper Jaw)
    if (ny < -0.15 && ny > -0.65 && nz > 0.2) {
      v.x *= 0.84;
      v.z *= 1.06;
      if (ny < -0.42) {
        v.y = -0.52 + Math.cos(v.x * 2.3) * 0.07;
      }
    }

    // Base of cranium
    if (ny < -0.32 && nz < 0.2) {
      v.y = Math.max(v.y, -0.46);
      v.z *= 0.94;
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates lower mandible geometry articulated at TMJ
 */
function createMandibleGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(1.54, 0.88, 1.34, 28, 20, 24);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    const t = (v.z + 0.68) / 1.34;
    const widthFactor = 1.0 - t * 0.46;
    v.x *= widthFactor;

    // Gonial Angle of Mandible
    if (v.z < -0.08 && v.y < -0.1) {
      v.x *= 1.15;
      v.y *= 1.08;
    }

    // Sloping jawline
    v.y = v.y - t * 0.44;

    // Chin (Mental Protuberance)
    if (v.z > 0.42 && v.y < -0.22) {
      v.z += 0.25;
      if (Math.abs(v.x) < 0.32) {
        v.z += 0.09;
      }
    }

    // Sub-mandibular oral hollow
    if (Math.abs(v.x) < 0.52 && v.y > -0.36 && v.z > -0.18 && v.z < 0.52) {
      v.y -= 0.30;
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates distinct cyber dental arch
 */
function createDentalArch(isUpper: boolean): THREE.Group {
  const arch = new THREE.Group();
  const toothCount = 12;
  const toothGeo = new THREE.BoxGeometry(0.08, 0.14, 0.09);

  const toothMat = new THREE.MeshStandardMaterial({
    color: 0x99f6ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.8,
  });

  const radiusX = 0.42;
  const radiusZ = 0.50;

  for (let i = 0; i < toothCount; i++) {
    const angle = ((i - (toothCount - 1) / 2) / (toothCount - 1)) * Math.PI * 0.72;
    const tooth = new THREE.Mesh(toothGeo, toothMat);

    const tx = Math.sin(angle) * radiusX;
    const tz = Math.cos(angle) * radiusZ;
    const ty = isUpper ? -0.52 : 0.07;

    tooth.position.set(tx, ty, tz);
    tooth.rotation.y = angle * 0.85;
    tooth.rotation.x = isUpper ? 0.06 : -0.06;

    const isMolar = Math.abs(i - (toothCount - 1) / 2) > 3.5;
    if (isMolar) {
      tooth.scale.set(1.35, 0.9, 1.25);
    }

    arch.add(tooth);
  }

  return arch;
}

/**
 * Creates procedural electric suture fissures that trace lightning paths across the skull
 */
function createCranialFissures(): THREE.BufferGeometry {
  const points: number[] = [];

  // Helper to add jagged lightning line between two points
  function addLightningSegment(p1: THREE.Vector3, p2: THREE.Vector3, segments = 8, jitter = 0.04) {
    let curr = p1.clone();
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const target = p1.clone().lerp(p2, t);
      if (i < segments) {
        target.x += (Math.random() - 0.5) * jitter;
        target.y += (Math.random() - 0.5) * jitter;
        target.z += (Math.random() - 0.5) * jitter;
      }
      points.push(curr.x, curr.y, curr.z);
      points.push(target.x, target.y, target.z);
      curr = target;
    }
  }

  // 1. Coronal Suture across cranium top
  addLightningSegment(new THREE.Vector3(-0.9, 0.7, 0.1), new THREE.Vector3(0, 1.15, 0.2), 10, 0.05);
  addLightningSegment(new THREE.Vector3(0, 1.15, 0.2), new THREE.Vector3(0.9, 0.7, 0.1), 10, 0.05);

  // 2. Sagittal Suture down center top
  addLightningSegment(new THREE.Vector3(0, 1.15, 0.2), new THREE.Vector3(0, 1.0, -0.6), 12, 0.05);

  // 3. Frontal Fissures down forehead into eyes
  addLightningSegment(new THREE.Vector3(0, 1.15, 0.2), new THREE.Vector3(-0.4, 0.35, 0.85), 8, 0.04);
  addLightningSegment(new THREE.Vector3(0, 1.15, 0.2), new THREE.Vector3(0.4, 0.35, 0.85), 8, 0.04);

  // 4. Temporal Fissures down temples
  addLightningSegment(new THREE.Vector3(-0.9, 0.7, 0.1), new THREE.Vector3(-0.85, 0.0, 0.55), 8, 0.04);
  addLightningSegment(new THREE.Vector3(0.9, 0.7, 0.1), new THREE.Vector3(0.85, 0.0, 0.55), 8, 0.04);

  // 5. Zygomatic Cheek Fissures
  addLightningSegment(new THREE.Vector3(-0.85, 0.0, 0.55), new THREE.Vector3(-0.45, -0.3, 0.75), 6, 0.03);
  addLightningSegment(new THREE.Vector3(0.85, 0.0, 0.55), new THREE.Vector3(0.45, -0.3, 0.75), 6, 0.03);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geo;
}

/**
 * Creates the Forehead Swirl / Spiral Vortex Mesh (as in reference video at 00:02)
 */
function createForeheadSwirl(): THREE.Mesh {
  const swirlGeo = new THREE.PlaneGeometry(0.55, 0.55, 32, 32);

  // Custom canvas procedural spiral texture
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const cx = 128, cy = 128;
  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, '#d946ef'); // vibrant magenta
  grad.addColorStop(0.7, '#8b5cf6'); // vibrant purple
  grad.addColorStop(1, 'transparent');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Draw spiral arms
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 6; a += 0.1) {
    const r = a * 6;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (a === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const swirlMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.0, // Fade in when thinking/processing
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const swirlMesh = new THREE.Mesh(swirlGeo, swirlMat);
  // Positioned on forehead
  swirlMesh.position.set(0, 0.62, 0.95);
  swirlMesh.rotation.x = -0.15;
  return swirlMesh;
}

/**
 * Creates eye with concentric vortex rings and glowing pupil core
 */
function createVortexEye(
  isLeft: boolean,
  accentHex = '#00FF66',
  secondaryHex = '#00E5FF'
): {
  eye: THREE.Group;
  eyeLight: THREE.PointLight;
  ring1Mat: THREE.MeshBasicMaterial;
  ring2Mat: THREE.MeshBasicMaterial;
  pupilMat: THREE.MeshBasicMaterial;
} {
  const eye = new THREE.Group();
  const eyeX = isLeft ? -0.46 : 0.46;
  eye.position.set(eyeX, 0.16, 0.55);

  // Dark orbital socket
  const socketGeo = new THREE.SphereGeometry(0.24, 20, 16);
  const socketMat = new THREE.MeshBasicMaterial({
    color: 0x020308,
    side: THREE.BackSide,
  });
  const socket = new THREE.Mesh(socketGeo, socketMat);
  eye.add(socket);

  // Concentric Vortex Ring 1 (Outer Accent)
  const ring1Geo = new THREE.RingGeometry(0.12, 0.18, 32);
  const ring1Mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(accentHex),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
  ring1.position.set(0, 0, 0.18);
  eye.add(ring1);

  // Concentric Vortex Ring 2 (Middle Secondary)
  const ring2Geo = new THREE.RingGeometry(0.06, 0.11, 28);
  const ring2Mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(secondaryHex),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  ring2.position.set(0, 0, 0.20);
  eye.add(ring2);

  // Glowing Pupil Core (Intense White/Cyan)
  const pupilGeo = new THREE.SphereGeometry(0.045, 16, 12);
  const pupilMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
  });
  const pupil = new THREE.Mesh(pupilGeo, pupilMat);
  pupil.position.set(0, 0, 0.21);
  eye.add(pupil);

  // Dedicated Eye PointLight (Pulses brightly when speaking)
  const eyeLight = new THREE.PointLight(new THREE.Color(accentHex), 1.2, 2.2);
  eyeLight.position.set(0, 0, 0.22);
  eye.add(eyeLight);

  return { eye, eyeLight, ring1Mat, ring2Mat, pupilMat };
}

/**
 * Master Builder: constructs the Exact Reference Cyber Electric Skull
 */
export function buildARAVANSkull(themeHex = '#00FF66', secondaryHex = '#00E5FF'): SkullParts {
  const skullGroup = new THREE.Group();
  skullGroup.position.set(0, 0, 0);

  const themeColor = new THREE.Color(themeHex);
  const secColor = new THREE.Color(secondaryHex);

  // 1. Translucent Dark Glass Skull Surface (Deep blue-black with electric rim)
  const skullSurfaceMat = new THREE.MeshStandardMaterial({
    color: 0x050c18,
    emissive: themeColor,
    emissiveIntensity: 0.35,
    roughness: 0.28,
    metalness: 0.82,
    transparent: true,
    opacity: 0.38,
    depthWrite: false, // CRITICAL: Never write depth on outer translucent shell so internal organs stay visible at every rotation angle
    depthTest: true,
    side: THREE.FrontSide,
  });

  // 2. Electric Wireframe (Fine edge contouring)
  const wireframeMat = new THREE.LineBasicMaterial({
    color: themeColor,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    depthTest: true,
  });

  // 3. Electric Cranial Fissures (Intense electric suture lightning)
  const fissuresMat = new THREE.LineBasicMaterial({
    color: secColor,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });

  // 4. Red/Magenta Nasal Bone Bridge Accent (Exact visual match from video)
  const nasalBridgeMat = new THREE.MeshBasicMaterial({
    color: 0xff2a6d,
    side: THREE.DoubleSide,
  });

  // CRANIUM GROUP
  const craniumGroup = new THREE.Group();
  skullGroup.add(craniumGroup);

  const craniumGeo = createCraniumGeometry();
  const craniumMesh = new THREE.Mesh(craniumGeo, skullSurfaceMat);
  craniumGroup.add(craniumMesh);

  // Wireframe
  const craniumWireGeo = new THREE.WireframeGeometry(craniumGeo);
  const craniumWireframe = new THREE.LineSegments(craniumWireGeo, wireframeMat);
  craniumGroup.add(craniumWireframe);

  // Suture Fissures
  const fissureGeo = createCranialFissures();
  const fissureLines = new THREE.LineSegments(fissureGeo, fissuresMat);
  craniumGroup.add(fissureLines);

  // Distinct Red/Pink Nasal Bridge Accent (#FF2A6D)
  const nasalGeo = new THREE.BoxGeometry(0.065, 0.18, 0.08);
  const nasalBridgeAccent = new THREE.Mesh(nasalGeo, nasalBridgeMat);
  nasalBridgeAccent.position.set(0, 0.02, 0.92);
  nasalBridgeAccent.rotation.x = -0.15;
  craniumGroup.add(nasalBridgeAccent);

  // Forehead Swirl Vortex (Reference 00:02)
  const foreheadSwirl = createForeheadSwirl();
  craniumGroup.add(foreheadSwirl);

  // Upper Dental Arch
  const upperTeeth = createDentalArch(true);
  craniumGroup.add(upperTeeth);

  // MANDIBLE GROUP (Lower Jaw / jawBone)
  const jawBone = new THREE.Group();
  jawBone.position.set(0, -0.22, -0.32);
  skullGroup.add(jawBone);

  const mandibleGeo = createMandibleGeometry();
  const jawMesh = new THREE.Mesh(mandibleGeo, skullSurfaceMat);
  jawMesh.position.set(0, -0.22, 0.42);
  jawBone.add(jawMesh);

  const jawWireGeo = new THREE.WireframeGeometry(mandibleGeo);
  const jawWireframe = new THREE.LineSegments(jawWireGeo, wireframeMat);
  jawWireframe.position.set(0, -0.22, 0.42);
  jawBone.add(jawWireframe);

  // Lower Dental Arch attached to jawBone
  const lowerTeeth = createDentalArch(false);
  lowerTeeth.position.set(0, -0.42, 0.46);
  jawBone.add(lowerTeeth);

  // INTERNAL NEURAL BRAIN & ANATOMICAL STRUCTURE (Uniform 360° internal organs)
  const brainGroup = new THREE.Group();
  brainGroup.position.set(0, 0.42, -0.14);
  brainGroup.renderOrder = 1;

  const hemiGeo = new THREE.SphereGeometry(0.62, 32, 28);
  const brainMat = new THREE.MeshStandardMaterial({
    color: secColor,
    emissive: secColor,
    emissiveIntensity: 0.65,
    roughness: 0.35,
    metalness: 0.7,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false, // Ensures internal brain never clips or disappears during skull rotation
    depthTest: true,
    side: THREE.DoubleSide, // Both sides visible uniformly from any rotation perspective
  });

  // Inner translucent brain core mass for volume density
  const innerBrainMat = new THREE.MeshStandardMaterial({
    color: secColor,
    emissive: secColor,
    emissiveIntensity: 0.4,
    roughness: 0.5,
    metalness: 0.3,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  const innerHemiGeo = new THREE.SphereGeometry(0.52, 24, 20);

  const rightHemi = new THREE.Mesh(hemiGeo, brainMat);
  rightHemi.position.set(0.22, 0.06, 0);
  rightHemi.scale.set(0.88, 0.82, 1.12);
  rightHemi.renderOrder = 1;
  brainGroup.add(rightHemi);

  const rightInner = new THREE.Mesh(innerHemiGeo, innerBrainMat);
  rightHemi.add(rightInner);

  const leftHemi = rightHemi.clone();
  leftHemi.position.set(-0.22, 0.06, 0);
  leftHemi.scale.set(-0.88, 0.82, 1.12);
  leftHemi.renderOrder = 1;
  brainGroup.add(leftHemi);

  // Cerebellum (Left & Right posterior lobes)
  const cerebellumGeo = new THREE.SphereGeometry(0.28, 20, 18);
  const cerebellumMat = new THREE.MeshStandardMaterial({
    color: secColor,
    emissive: secColor,
    emissiveIntensity: 0.55,
    roughness: 0.4,
    metalness: 0.5,
    wireframe: true,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  const rightCerebellum = new THREE.Mesh(cerebellumGeo, cerebellumMat);
  rightCerebellum.position.set(0.18, -0.32, -0.28);
  rightCerebellum.scale.set(0.85, 0.65, 0.95);
  rightCerebellum.renderOrder = 1;
  brainGroup.add(rightCerebellum);

  const leftCerebellum = new THREE.Mesh(cerebellumGeo, cerebellumMat);
  leftCerebellum.position.set(-0.18, -0.32, -0.28);
  leftCerebellum.scale.set(0.85, 0.65, 0.95);
  leftCerebellum.renderOrder = 1;
  brainGroup.add(leftCerebellum);

  // Brainstem / Medulla Oblongata conduit extending into spinal base
  const stemGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.55, 16);
  const stemMat = new THREE.MeshStandardMaterial({
    color: secColor,
    emissive: secColor,
    emissiveIntensity: 0.5,
    wireframe: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  const brainStem = new THREE.Mesh(stemGeo, stemMat);
  brainStem.position.set(0, -0.42, -0.18);
  brainStem.rotation.x = 0.12;
  brainStem.renderOrder = 1;
  brainGroup.add(brainStem);

  const brainCoreLight = new THREE.PointLight(secColor, 1.6, 2.8);
  brainGroup.add(brainCoreLight);
  craniumGroup.add(brainGroup);

  // CYBER VORTEX EYES (Dual lights & concentric rings)
  const leftEyeData = createVortexEye(true, themeHex, secondaryHex);
  const rightEyeData = createVortexEye(false, themeHex, secondaryHex);
  leftEyeData.eye.renderOrder = 2;
  rightEyeData.eye.renderOrder = 2;
  craniumGroup.add(leftEyeData.eye);
  craniumGroup.add(rightEyeData.eye);

  // Holographic Vertex Point Cloud (visible primarily in POINTS render mode)
  const glowPointsMat = new THREE.PointsMaterial({
    color: themeColor,
    size: 0.032,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const craniumPoints = new THREE.Points(craniumGeo, glowPointsMat);
  craniumPoints.visible = false;
  craniumGroup.add(craniumPoints);

  const jawPoints = new THREE.Points(mandibleGeo, glowPointsMat);
  jawPoints.position.set(0, -0.22, 0.42);
  jawPoints.visible = false;
  jawBone.add(jawPoints);

  fissureLines.renderOrder = 3;
  craniumWireframe.renderOrder = 4;
  jawWireframe.renderOrder = 4;
  craniumMesh.renderOrder = 5;
  jawMesh.renderOrder = 5;

  return {
    skullGroup,
    craniumGroup,
    jawBone,
    brainGroup,
    leftEye: leftEyeData.eye,
    rightEye: rightEyeData.eye,
    foreheadSwirl,
    nasalBridgeAccent,
    fissureLines,
    brainCoreLight,
    leftEyeLight: leftEyeData.eyeLight,
    rightEyeLight: rightEyeData.eyeLight,
    craniumMesh,
    craniumWireframe,
    craniumPoints,
    jawMesh,
    jawWireframe,
    jawPoints,
    materials: {
      skullSurface: skullSurfaceMat,
      wireframe: wireframeMat,
      fissures: fissuresMat,
      nasalBridge: nasalBridgeMat,
      eyeIris: leftEyeData.ring1Mat,
      eyeIrisRight: rightEyeData.ring1Mat,
      eyeIrisInnerLeft: leftEyeData.ring2Mat,
      eyeIrisInnerRight: rightEyeData.ring2Mat,
      eyePupil: leftEyeData.pupilMat,
      eyePupilRight: rightEyeData.pupilMat,
      swirl: foreheadSwirl.material as THREE.MeshBasicMaterial,
      teeth: (upperTeeth.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial,
      brain: brainMat,
      innerBrain: innerBrainMat,
      cerebellum: cerebellumMat,
      brainStem: stemMat,
      glowPoints: glowPointsMat,
    },
  };
}

export interface SkullColorMixWeights {
  cyan: number;
  purple: number;
  blue: number;
  magenta: number;
  cyanEnergy?: number;
  purpleEnergy?: number;
}

/**
 * Computes harmonized primary & secondary Three.js colors by blending the active
 * theme preset with real-time Color Mix & Cyan/Purple Energy sliders (0-100).
 */
export function computeBlendedSkullColors(
  theme: { accent: string; secondary: string },
  mix?: SkullColorMixWeights
): { primary: THREE.Color; secondary: THREE.Color; glassTint: THREE.Color; nasal: THREE.Color } {
  const basePrimary = new THREE.Color(theme.accent);
  const baseSecondary = new THREE.Color(theme.secondary);
  const glassBase = new THREE.Color(0x050c18);
  const nasalBase = new THREE.Color(0xff2a6d);

  if (!mix) {
    return {
      primary: basePrimary,
      secondary: baseSecondary,
      glassTint: glassBase,
      nasal: nasalBase,
    };
  }

  const cyanSpec = new THREE.Color(0x00e5ff);
  const purpleSpec = new THREE.Color(0x8b5cf6);
  const blueSpec = new THREE.Color(0x2563eb);
  const magentaSpec = new THREE.Color(0xff2a6d);

  const cW = Math.max(0, Math.min(1, mix.cyan / 100));
  const pW = Math.max(0, Math.min(1, mix.purple / 100));
  const bW = Math.max(0, Math.min(1, mix.blue / 100));
  const mW = Math.max(0, Math.min(1, mix.magenta / 100));
  const cyanE = mix.cyanEnergy !== undefined ? Math.max(0, Math.min(1, mix.cyanEnergy / 100)) : cW;
  const purpleE = mix.purpleEnergy !== undefined ? Math.max(0, Math.min(1, mix.purpleEnergy / 100)) : pW;

  // Primary surface rim / wireframe blends theme accent with cyan, blue & cyanEnergy
  const primary = basePrimary.clone();
  primary.lerp(cyanSpec, Math.min(0.75, cW * 0.45 + cyanE * 0.3));
  primary.lerp(blueSpec, bW * 0.25);

  // Secondary brain / internal energy blends theme secondary with purple, magenta & purpleEnergy
  const secondary = baseSecondary.clone();
  secondary.lerp(purpleSpec, Math.min(0.8, pW * 0.5 + purpleE * 0.3));
  secondary.lerp(magentaSpec, mW * 0.28);

  // Dark translucent glass cranium stays deep blue-black tinted subtly by Blue Spectrum
  const glassTint = glassBase.clone().lerp(new THREE.Color(0x0d2855), bW * 0.65);

  // Nasal bone bridge responds smoothly to Magenta Accent
  const nasal = new THREE.Color(0x4a1230).lerp(nasalBase, 0.25 + mW * 0.75);

  return { primary, secondary, glassTint, nasal };
}

/**
 * Dynamically updates all skull components to glow uniformly in the chosen theme + color mix
 */
export function applyThemeToSkull(
  parts: SkullParts,
  theme: { accent: string; secondary: string; glow?: string },
  mix?: SkullColorMixWeights
): void {
  if (!parts) return;
  const { primary, secondary, glassTint, nasal } = computeBlendedSkullColors(theme, mix);

  // 1. Wireframe, Fissures, Points & Teeth
  if (parts.materials.wireframe) {
    parts.materials.wireframe.color.copy(primary);
    parts.materials.wireframe.needsUpdate = true;
  }
  if (parts.materials.fissures) {
    parts.materials.fissures.color.copy(secondary);
    parts.materials.fissures.needsUpdate = true;
  }
  if (parts.materials.glowPoints) {
    parts.materials.glowPoints.color.copy(primary);
    parts.materials.glowPoints.needsUpdate = true;
  }
  if (parts.materials.teeth) {
    parts.materials.teeth.emissive.copy(primary);
    parts.materials.teeth.needsUpdate = true;
  }
  if (parts.materials.nasalBridge) {
    parts.materials.nasalBridge.color.copy(nasal);
    parts.materials.nasalBridge.needsUpdate = true;
  }

  // 2. Dark translucent glass skull surface (preserve deep glass base, tint emissive)
  if (parts.materials.skullSurface) {
    parts.materials.skullSurface.color.copy(glassTint);
    parts.materials.skullSurface.emissive.copy(primary);
    parts.materials.skullSurface.needsUpdate = true;
  }

  // 3. Brain structures & core light
  if (parts.brainCoreLight) {
    parts.brainCoreLight.color.copy(secondary);
  }
  [
    parts.materials.brain,
    parts.materials.innerBrain,
    parts.materials.cerebellum,
    parts.materials.brainStem,
  ].forEach((mat) => {
    if (!mat) return;
    mat.color.copy(secondary);
    if (mat.emissive) mat.emissive.copy(secondary);
    mat.needsUpdate = true;
  });

  // 4. Dual Eye PointLights & Concentric Vortex Rings
  if (parts.leftEyeLight) parts.leftEyeLight.color.copy(primary);
  if (parts.rightEyeLight) parts.rightEyeLight.color.copy(primary);

  [parts.materials.eyeIris, parts.materials.eyeIrisRight].forEach((mat) => {
    if (!mat) return;
    mat.color.copy(primary);
    mat.needsUpdate = true;
  });
  [parts.materials.eyeIrisInnerLeft, parts.materials.eyeIrisInnerRight].forEach((mat) => {
    if (!mat) return;
    mat.color.copy(secondary);
    mat.needsUpdate = true;
  });
}
