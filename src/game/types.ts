/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vector2D {
  x: number;
  y: number;
}

export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';

export interface RagdollJoint {
  p1Index: number;
  p2Index: number;
  length: number;
  stiffness: number;
  broken: boolean;
  canBreak?: boolean;
  breakThreshold?: number;
  name?: string;
}

export interface RagdollParticle {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  radius: number;
  mass: number;
  isHead?: boolean;
  isTorso?: boolean;
  isLimb?: boolean;
  color?: string;
  name: string;
}

export interface Ragdoll {
  id: string;
  isPlayer: boolean;
  isAlive: boolean;
  isEliminated: boolean;
  isLimp: boolean;
  particles: RagdollParticle[];
  joints: RagdollJoint[];
  name: string;
  facing: 1 | -1;
  eyeState: 'normal' | 'scared' | 'dead';
  color: {
    skin: string;
    shirt: string;
    pants: string;
    hat?: string;
  };
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
  timeLeft: number;
  bounces: number;
  trail: { x: number; y: number; alpha: number }[];
}

export interface RopeWeight {
  anchorX: number;
  anchorY: number;
  ballX: number;
  ballY: number;
  ballOldX: number;
  ballOldY: number;
  ballRadius: number;
  length: number;
  isCut: boolean;
  mass: number;
}

export interface RollingBoulderConfig {
  isRolling: boolean;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vRot: number;
  linkedWedgeId?: string;
}

export interface FallingWeightConfig {
  isFalling: boolean;
  vx: number;
  vy: number;
  mass: number;
  linkedPillarId?: string;
  hasLanded?: boolean;
}

export interface TrapdoorConfig {
  isOpen: boolean;
  angle: number;
  pivotX: number;
  pivotY: number;
  linkedLockId?: string;
}

/** Runtime state for a crate that can be pushed by shots or other crates. */
export interface CrateConfig {
  vx: number;
  vy: number;
  mass: number;
  isResting?: boolean;
}

/** Runtime state for a plank that can pivot after being hit or losing support. */
export interface PlankConfig {
  pivotX: number;
  pivotY: number;
  angle: number;
  angularVelocity: number;
  canRotate: boolean;
  gravityEnabled?: boolean;
  linkedSupportId?: string;
  activated?: boolean;
}

/** Shared state for pressure plates and timed spike traps. */
export interface TrapConfig {
  linkedTrapId?: string;
  activated?: boolean;
  requiresWeight?: boolean;
  activationDelay?: number;
  elapsed?: number;
  pending?: boolean;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type:
    | 'wall'
    | 'destructible'
    | 'explosive_barrel'
    | 'switch'
    | 'door'
    | 'moving_platform'
    | 'portal'
    | 'hazard_spikes'
    | 'glass'
    | 'bouncer'
    | 'rope_weight'
    | 'rolling_boulder'
    | 'wedge'
    | 'falling_weight'
    | 'support_pillar'
    | 'trapdoor'
    // Additional puzzle mechanics:
    | 'pushable_crate'
    | 'pressure_plate'
    | 'trap_spikes'
    | 'plank'
    // Optional types used by some level layouts / rendering implementations:
    | 'domino'
    | 'laser'
    | 'mirror'
    | 'timed_trap';
  health?: number;
  maxHealth?: number;
  isDestroyed?: boolean;
  isTriggered?: boolean;
  color?: string;
  /** Optional mass used by physics interactions, particularly crates. */
  mass?: number;
  /** Optional blast radius for explosive barrels. */
  explosionRadius?: number;
  movingConfig?: {
    axis: 'x' | 'y';
    min: number;
    max: number;
    speed: number;
    currentDir: number;
  };
  doorConfig?: {
    isOpen: boolean;
    openHeight: number;
    initialHeight: number;
    openSpeed: number;
  };
  portalConfig?: {
    pairId: string;
    exitDirX: number;
    exitDirY: number;
  };
  ropeConfig?: RopeWeight;
  rollingConfig?: RollingBoulderConfig;
  fallingConfig?: FallingWeightConfig;
  trapdoorConfig?: TrapdoorConfig;
  crateConfig?: CrateConfig;
  plankConfig?: PlankConfig;
  trapConfig?: TrapConfig;
  bouncerSquash?: number;
  targetSwitchId?: string;
  label?: string; // e.g. "CALE", "SOUTÈNEMENT", "LOQUET"
}

export interface ParticleEffect {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type?: 'spark' | 'smoke' | 'star' | 'debris' | 'glass_shard' | 'portal_ring';
}

export interface ComicPopText {
  id: string;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  rotation: number;
  color: string;
  bgColor: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  puzzleHint: string;
  ammoCount: number;
  playerPos: Vector2D;
  playerAimHintAngle?: number;
  enemies: {
    x: number;
    y: number;
    name: string;
    facing?: 1 | -1;
    color?: { skin: string; shirt: string; pants: string; hat?: string };
  }[];
  obstacles: Obstacle[];
  targetTimeScore: number;
}
