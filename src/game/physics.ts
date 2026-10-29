/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ragdoll, RagdollParticle, RagdollJoint, Bullet, Obstacle, ComicPopText, Vector2D } from './types';

export const GRAVITY = 850; // px/s^2
export const BULLET_SPEED = 920; // px/s
export const MAX_BULLET_TIME = 4.0; // exact 4 seconds constraint

// Create a full ragdoll skeleton at (x, y) with comic ink cartoon styling
export function createRagdoll(
  id: string,
  x: number,
  y: number,
  isPlayer: boolean = false,
  name: string = 'Goon',
  facing: 1 | -1 = 1,
  colorConfig?: { skin: string; shirt: string; pants: string; hat?: string }
): Ragdoll {
  // Muted vintage comic palette
  const skin = colorConfig?.skin || (isPlayer ? '#F3D2B8' : '#F7D0BC');
  const shirt = colorConfig?.shirt || (isPlayer ? '#3B536B' : '#8A4036'); // Muted navy vs muted crimson
  const pants = colorConfig?.pants || (isPlayer ? '#28313D' : '#3F444C'); // Charcoal

  // Particle positions relative to anchor
  // 0: Head, 1: Torso, 2: Left Arm, 3: Right Arm, 4: Left Leg, 5: Right Leg
  const particles: RagdollParticle[] = [
    { x: x, y: y - 40, oldX: x, oldY: y - 40, radius: 13, mass: 1.0, isHead: true, color: skin, name: 'head' },
    { x: x, y: y - 18, oldX: x, oldY: y - 18, radius: 15, mass: 1.8, isTorso: true, color: shirt, name: 'torso' },
    { x: x - 18 * facing, y: y - 16, oldX: x - 18 * facing, oldY: y - 16, radius: 7, mass: 0.6, isLimb: true, color: shirt, name: 'leftArm' },
    { x: x + 18 * facing, y: y - 16, oldX: x + 18 * facing, oldY: y - 16, radius: 7, mass: 0.6, isLimb: true, color: shirt, name: 'rightArm' },
    { x: x - 9 * facing, y: y + 12, oldX: x - 9 * facing, oldY: y + 12, radius: 8, mass: 0.9, isLimb: true, color: pants, name: 'leftLeg' },
    { x: x + 9 * facing, y: y + 12, oldX: x + 9 * facing, oldY: y + 12, radius: 8, mass: 0.9, isLimb: true, color: pants, name: 'rightLeg' }
  ];

  const joints: RagdollJoint[] = [
    { p1Index: 0, p2Index: 1, length: 22, stiffness: 0.95, broken: false, canBreak: true, breakThreshold: 2200, name: 'neck' },
    { p1Index: 1, p2Index: 2, length: 18, stiffness: 0.85, broken: false, canBreak: true, breakThreshold: 1800, name: 'leftShoulder' },
    { p1Index: 1, p2Index: 3, length: 18, stiffness: 0.85, broken: false, canBreak: true, breakThreshold: 1800, name: 'rightShoulder' },
    { p1Index: 1, p2Index: 4, length: 30, stiffness: 0.9, broken: false, canBreak: true, breakThreshold: 2000, name: 'leftHip' },
    { p1Index: 1, p2Index: 5, length: 30, stiffness: 0.9, broken: false, canBreak: true, breakThreshold: 2000, name: 'rightHip' },
    { p1Index: 4, p2Index: 5, length: 18, stiffness: 0.6, broken: false, canBreak: true, breakThreshold: 1900, name: 'pelvis' }
  ];

  return {
    id,
    isPlayer,
    isAlive: true,
    isEliminated: false,
    isLimp: false,
    particles,
    joints,
    name,
    facing,
    eyeState: 'normal',
    color: {
      skin,
      shirt,
      pants,
      hat: colorConfig?.hat || (isPlayer ? '#1E293B' : '#5C241E')
    }
  };
}

// Verlet integration for ragdolls
export function updateRagdoll(
  ragdoll: Ragdoll,
  dt: number,
  obstacles: Obstacle[],
  canvasWidth: number,
  canvasHeight: number,
  bulletActive: boolean,
  bulletPositions?: Vector2D[]
) {
  const subDt = dt;
  const g = GRAVITY * subDt * subDt;

  // Eye reactions based on nearest bullet
  if (ragdoll.isAlive && bulletActive && bulletPositions && bulletPositions.length > 0) {
    const head = ragdoll.particles[0];
    let isNear = false;
    for (const bpos of bulletPositions) {
      const dx = bpos.x - head.x;
      const dy = bpos.y - head.y;
      if (dx * dx + dy * dy < 160 * 160) {
        isNear = true;
        break;
      }
    }
    ragdoll.eyeState = isNear ? 'scared' : 'normal';
  } else if (!ragdoll.isAlive) {
    ragdoll.eyeState = 'dead';
  }

  // 1. Move particles with gravity
  for (let i = 0; i < ragdoll.particles.length; i++) {
    const p = ragdoll.particles[i];
    const vx = (p.x - p.oldX) * 0.985;
    const vy = (p.y - p.oldY) * 0.985;

    p.oldX = p.x;
    p.oldY = p.y;

    p.x += vx;
    p.y += vy + g;
  }

  // 2. Solve distance constraints and stance (6 iterations)
  const iterations = 6;
  for (let it = 0; it < iterations; it++) {
    for (const joint of ragdoll.joints) {
      if (joint.broken) continue;

      const p1 = ragdoll.particles[joint.p1Index];
      const p2 = ragdoll.particles[joint.p2Index];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const currentDist = Math.hypot(dx, dy);
      if (currentDist === 0) continue;

      const diff = (currentDist - joint.length) / currentDist;
      const offsetFactor = 0.5 * joint.stiffness;

      const invMass1 = 1 / p1.mass;
      const invMass2 = 1 / p2.mass;
      const totalInv = invMass1 + invMass2;

      const w1 = invMass1 / totalInv;
      const w2 = invMass2 / totalInv;

      p1.x += dx * diff * offsetFactor * w1;
      p1.y += dy * diff * offsetFactor * w1;
      p2.x -= dx * diff * offsetFactor * w2;
      p2.y -= dy * diff * offsetFactor * w2;
    }

    // Upright stance constraint for living ragdolls
    if (ragdoll.isAlive && !ragdoll.isLimp) {
      const head = ragdoll.particles[0];
      const torso = ragdoll.particles[1];
      const leftLeg = ragdoll.particles[4];
      const rightLeg = ragdoll.particles[5];

      const feetMidX = (leftLeg.x + rightLeg.x) * 0.5;
      torso.x += (feetMidX - torso.x) * 0.08;
      head.x += (torso.x - head.x) * 0.12;

      if (head.y > torso.y - 18) {
        head.y = torso.y - 18;
      }
    }

    // Particle collision with bounds and obstacles
    for (const p of ragdoll.particles) {
      const floorY = canvasHeight - 20;
      if (p.y + p.radius > floorY) {
        p.y = floorY - p.radius;
        p.oldX = p.x + (p.oldX - p.x) * 0.5;
      }
      if (p.x - p.radius < 20) p.x = 20 + p.radius;
      if (p.x + p.radius > canvasWidth - 20) p.x = canvasWidth - 20 - p.radius;
      if (p.y - p.radius < 20) p.y = 20 + p.radius;

      // Obstacle collisions
      for (const obs of obstacles) {
        if (
          obs.isDestroyed ||
          obs.type === 'portal' ||
          (obs.type === 'door' && obs.doorConfig?.isOpen && obs.height === 0) ||
          (obs.type === 'trapdoor' && obs.trapdoorConfig?.isOpen)
        )
          continue;

        const left = obs.x;
        const right = obs.x + obs.width;
        const top = obs.y;
        const bottom = obs.y + obs.height;

        const closeX = Math.max(left, Math.min(p.x, right));
        const closeY = Math.max(top, Math.min(p.y, bottom));

        let cdx = p.x - closeX;
        let cdy = p.y - closeY;
        let dist = Math.hypot(cdx, cdy);

        if (dist < p.radius) {
          // If hazard spikes: instantly eliminate living ragdoll!
          if (obs.type === 'hazard_spikes' && ragdoll.isAlive) {
            applyImpulseToRagdoll(ragdoll, p.x, p.y, (Math.random() - 0.5) * 800, -900);
          }

          if (dist === 0) {
            cdx = 0;
            cdy = -1;
            dist = 1;
          }
          const overlap = p.radius - dist;
          const nx = cdx / dist;
          const ny = cdy / dist;
          p.x += nx * overlap;
          p.y += ny * overlap;

          if (ny < -0.5) {
            p.oldX = p.x + (p.oldX - p.x) * 0.5;
          }
        }
      }
    }
  }
}

// Update all indirect environmental puzzle mechanisms (rolling boulders, falling slabs, trapdoors)
export function updatePuzzleMechanisms(
  obstacles: Obstacle[],
  dt: number,
  ragdolls: Ragdoll[],
  canvasHeight: number,
  onCrushRagdoll: (ragdoll: Ragdoll, x: number, y: number, text: string) => void
) {
  // 1. Check trigger states (e.g. wedges destroyed -> boulders roll, pillars destroyed -> weights fall)
  for (const obs of obstacles) {
    // Rolling Boulders
    if (obs.type === 'rolling_boulder' && obs.rollingConfig) {
      const b = obs.rollingConfig;
      if (!b.isRolling && b.linkedWedgeId) {
        const wedge = obstacles.find(o => o.id === b.linkedWedgeId);
        if (!wedge || wedge.isDestroyed) {
          b.isRolling = true;
          b.vx = 220; // initial roll kick
        }
      }

      if (b.isRolling) {
        obs.x += b.vx * dt;
        obs.y += b.vy * dt;
        b.vy += 800 * dt; // gravity
        b.rotation += b.vRot * dt;

        // Ground / Floor contact
        const floorY = canvasHeight - 20;
        if (obs.y + b.radius > floorY) {
          obs.y = floorY - b.radius;
          b.vy = 0;
          b.vx *= 0.992; // slight ground roll friction
        }

        // Check if rolling boulder rolls over enemies!
        const bSpeed = Math.abs(b.vx);
        if (bSpeed > 80) {
          for (const rag of ragdolls) {
            if (!rag.isAlive) continue;
            for (let pIdx = 0; pIdx < rag.particles.length; pIdx++) {
              const part = rag.particles[pIdx];
              const dist = Math.hypot(obs.x - part.x, obs.y - part.y);
              if (dist < b.radius + part.radius) {
                applyImpulseToRagdoll(rag, obs.x, obs.y, b.vx * 2.5, -450, pIdx);
                onCrushRagdoll(rag, part.x, part.y, "ÉCRASÉ !");
                break;
              }
            }
          }
        }
      }
    }

    // Falling Heavy Weights / Slabs
    if (obs.type === 'falling_weight' && obs.fallingConfig) {
      const f = obs.fallingConfig;
      if (!f.isFalling && f.linkedPillarId) {
        const pillar = obstacles.find(o => o.id === f.linkedPillarId);
        if (!pillar || pillar.isDestroyed) {
          f.isFalling = true;
        }
      }

      if (f.isFalling && !f.hasLanded) {
        obs.y += f.vy * dt;
        f.vy += 950 * dt; // gravity

        // Floor collision
        const floorY = canvasHeight - 20;
        if (obs.y + obs.height > floorY) {
          obs.y = floorY - obs.height;
          f.vy = 0;
          f.hasLanded = true;
        }

        // Check if falling weight squashes ragdolls below
        if (f.vy > 100) {
          for (const rag of ragdolls) {
            if (!rag.isAlive) continue;
            for (let pIdx = 0; pIdx < rag.particles.length; pIdx++) {
              const part = rag.particles[pIdx];
              if (
                part.x >= obs.x &&
                part.x <= obs.x + obs.width &&
                part.y >= obs.y &&
                part.y <= obs.y + obs.height + part.radius
              ) {
                applyImpulseToRagdoll(rag, part.x, part.y, (Math.random() - 0.5) * 300, 400, pIdx);
                onCrushRagdoll(rag, part.x, part.y, "APLATI !");
                break;
              }
            }
          }
        }
      }
    }

    // Trapdoors
    if (obs.type === 'trapdoor' && obs.trapdoorConfig) {
      const td = obs.trapdoorConfig;
      if (!td.isOpen && td.linkedLockId) {
        const lock = obstacles.find(o => o.id === td.linkedLockId);
        if (!lock || lock.isDestroyed || lock.isTriggered) {
          td.isOpen = true;
        }
      }

      if (td.isOpen && td.angle < Math.PI / 2) {
        td.angle += 6 * dt; // swing open fast
      }
    }
  }
}

// Update pendulum rope weights
export function updateRopeWeights(
  obstacles: Obstacle[],
  dt: number,
  ragdolls: Ragdoll[],
  canvasHeight: number,
  onCrushRagdoll: (ragdoll: Ragdoll, x: number, y: number) => void
) {
  const g = GRAVITY * dt * dt;

  for (const obs of obstacles) {
    if (obs.type !== 'rope_weight' || !obs.ropeConfig) continue;
    const rope = obs.ropeConfig;

    // Ball Verlet physics
    const vx = (rope.ballX - rope.ballOldX) * 0.99;
    const vy = (rope.ballY - rope.ballOldY) * 0.99;

    rope.ballOldX = rope.ballX;
    rope.ballOldY = rope.ballY;

    rope.ballX += vx;
    rope.ballY += vy + g;

    // If rope intact, constrain to anchor
    if (!rope.isCut) {
      const dx = rope.ballX - rope.anchorX;
      const dy = rope.ballY - rope.anchorY;
      const currentDist = Math.hypot(dx, dy);
      if (currentDist > 0) {
        const diff = (currentDist - rope.length) / currentDist;
        rope.ballX -= dx * diff;
        rope.ballY -= dy * diff;
      }
    } else {
      // Free falling boulder floor collision
      const floorY = canvasHeight - 20;
      if (rope.ballY + rope.ballRadius > floorY) {
        rope.ballY = floorY - rope.ballRadius;
        rope.ballOldY = rope.ballY + (rope.ballOldY - rope.ballY) * 0.3; // bounce
        rope.ballOldX = rope.ballX + (rope.ballOldX - rope.ballX) * 0.8; // roll friction
      }
    }

    // Check if heavy ball crushes ragdolls
    const ballSpeed = Math.hypot(rope.ballX - rope.ballOldX, rope.ballY - rope.ballOldY) / Math.max(dt, 0.001);
    if (ballSpeed > 140) {
      for (const rag of ragdolls) {
        if (!rag.isAlive) continue;
        for (let pIdx = 0; pIdx < rag.particles.length; pIdx++) {
          const part = rag.particles[pIdx];
          const dist = Math.hypot(rope.ballX - part.x, rope.ballY - part.y);
          if (dist < rope.ballRadius + part.radius) {
            const pushDirX = (part.x - rope.ballX) || 1;
            const pushDirY = (part.y - rope.ballY) || -1;
            const norm = Math.hypot(pushDirX, pushDirY);
            applyImpulseToRagdoll(
              rag,
              rope.ballX,
              rope.ballY,
              (pushDirX / norm) * (ballSpeed * 2.2),
              (pushDirY / norm) * (ballSpeed * 2.2),
              pIdx
            );
            onCrushRagdoll(rag, part.x, part.y);
            break;
          }
        }
      }
    }
  }
}

// Apply explosive or bullet impact to ragdoll
export function applyImpulseToRagdoll(
  ragdoll: Ragdoll,
  impactX: number,
  impactY: number,
  impulseX: number,
  impulseY: number,
  directParticleIndex?: number
) {
  ragdoll.isLimp = true;
  ragdoll.isAlive = false;
  ragdoll.isEliminated = true;
  ragdoll.eyeState = 'dead';

  const impulseMag = Math.hypot(impulseX, impulseY);

  for (const joint of ragdoll.joints) {
    if (joint.canBreak && impulseMag > (joint.breakThreshold || 2000)) {
      if (Math.random() < 0.65) {
        joint.broken = true;
      }
    }
  }

  if (directParticleIndex !== undefined && ragdoll.particles[directParticleIndex]) {
    const direct = ragdoll.particles[directParticleIndex];
    direct.oldX = direct.x - impulseX / direct.mass;
    direct.oldY = direct.y - impulseY / direct.mass;
  }

  for (let i = 0; i < ragdoll.particles.length; i++) {
    if (i === directParticleIndex) continue;
    const p = ragdoll.particles[i];
    const dx = p.x - impactX;
    const dy = p.y - impactY;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const factor = Math.max(0.3, 1 - dist / 120);

    p.oldX = p.x - (impulseX * factor) / p.mass;
    p.oldY = p.y - (impulseY * factor) / p.mass;
  }
}

// Raycast bounce prediction for the aiming laser with portals and bouncers
export function calculateLaserPath(
  startX: number,
  startY: number,
  angleRad: number,
  obstacles: Obstacle[],
  canvasWidth: number,
  canvasHeight: number,
  maxBounces: number = 3
): Vector2D[] {
  const points: Vector2D[] = [{ x: startX, y: startY }];
  let currentX = startX;
  let currentY = startY;
  let dirX = Math.cos(angleRad);
  let dirY = Math.sin(angleRad);

  for (let b = 0; b < maxBounces; b++) {
    let closestT = 1200;
    let hitNormalX = 0;
    let hitNormalY = 0;
    let hitPortal: Obstacle | null = null;

    // Check canvas boundaries
    const boundarySegments = [
      { x1: 20, y1: 20, x2: canvasWidth - 20, y2: 20, nx: 0, ny: 1 },
      { x1: 20, y1: canvasHeight - 20, x2: canvasWidth - 20, y2: canvasHeight - 20, nx: 0, ny: -1 },
      { x1: 20, y1: 20, x2: 20, y2: canvasHeight - 20, nx: 1, ny: 0 },
      { x1: canvasWidth - 20, y1: 20, x2: canvasWidth - 20, y2: canvasHeight - 20, nx: -1, ny: 0 }
    ];

    for (const seg of boundarySegments) {
      const hit = raySegmentIntersect(currentX, currentY, dirX, dirY, seg.x1, seg.y1, seg.x2, seg.y2);
      if (hit && hit.t > 0.5 && hit.t < closestT) {
        closestT = hit.t;
        hitNormalX = seg.nx;
        hitNormalY = seg.ny;
        hitPortal = null;
      }
    }

    // Check Obstacles
    for (const obs of obstacles) {
      if (obs.isDestroyed || (obs.type === 'door' && obs.doorConfig?.isOpen && obs.height === 0)) continue;

      if (obs.type === 'portal') {
        const hit = raySegmentIntersect(
          currentX,
          currentY,
          dirX,
          dirY,
          obs.x,
          obs.y,
          obs.x + obs.width,
          obs.y + obs.height
        );
        if (hit && hit.t > 0.5 && hit.t < closestT) {
          closestT = hit.t;
          hitPortal = obs;
          hitNormalX = 0;
          hitNormalY = 0;
        }
        continue;
      }

      const segments = [
        { x1: obs.x, y1: obs.y, x2: obs.x + obs.width, y2: obs.y, nx: 0, ny: -1 },
        { x1: obs.x, y1: obs.y + obs.height, x2: obs.x + obs.width, y2: obs.y + obs.height, nx: 0, ny: 1 },
        { x1: obs.x, y1: obs.y, x2: obs.x, y2: obs.y + obs.height, nx: -1, ny: 0 },
        { x1: obs.x + obs.width, y1: obs.y, x2: obs.x + obs.width, y2: obs.y + obs.height, nx: 1, ny: 0 }
      ];

      for (const seg of segments) {
        const hit = raySegmentIntersect(currentX, currentY, dirX, dirY, seg.x1, seg.y1, seg.x2, seg.y2);
        if (hit && hit.t > 0.5 && hit.t < closestT) {
          closestT = hit.t;
          hitNormalX = seg.nx;
          hitNormalY = seg.ny;
          hitPortal = null;
        }
      }
    }

    if (closestT < 1200) {
      currentX += dirX * closestT;
      currentY += dirY * closestT;
      points.push({ x: currentX, y: currentY });

      // If hit portal, warp trajectory!
      if (hitPortal && hitPortal.portalConfig) {
        const pair = obstacles.find(o => o.id === hitPortal?.portalConfig?.pairId);
        if (pair && pair.portalConfig) {
          currentX = pair.x + pair.width / 2 + pair.portalConfig.exitDirX * 16;
          currentY = pair.y + pair.height / 2 + pair.portalConfig.exitDirY * 16;
          dirX = pair.portalConfig.exitDirX;
          dirY = pair.portalConfig.exitDirY;
          points.push({ x: currentX, y: currentY });
          continue;
        }
      }

      const dot = dirX * hitNormalX + dirY * hitNormalY;
      dirX = dirX - 2 * dot * hitNormalX;
      dirY = dirY - 2 * dot * hitNormalY;
    } else {
      points.push({ x: currentX + dirX * 300, y: currentY + dirY * 300 });
      break;
    }
  }

  return points;
}

export function raySegmentIntersect(
  rx: number,
  ry: number,
  rdx: number,
  rdy: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { t: number } | null {
  const dx = x2 - x1;
  const dy = y2 - y1;

  const denom = rdx * dy - rdy * dx;
  if (Math.abs(denom) < 0.0001) return null;

  const t1 = ((x1 - rx) * dy - (y1 - ry) * dx) / denom;
  const t2 = ((x1 - rx) * rdy - (y1 - ry) * rdx) / denom;

  if (t1 > 0 && t2 >= 0 && t2 <= 1) {
    return { t: t1 };
  }
  return null;
}
