/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Ragdoll, Bullet, Obstacle, ParticleEffect, LevelConfig, Vector2D, ComicPopText } from '../game/types';
import {
  createRagdoll,
  updateRagdoll,
  updateRopeWeights,
  applyImpulseToRagdoll,
  calculateLaserPath,
  raySegmentIntersect,
  BULLET_SPEED,
  MAX_BULLET_TIME
} from '../game/physics';
import { sounds } from '../game/audio';

interface GameCanvasProps {
  level: LevelConfig;
  onVictory: (stats: { timeUsed: number; bounces: number; bulletsUsed: number }) => void;
  onDefeat: (reason: string) => void;
  onTimeUpdate: (timeLeft: number) => void;
  onEnemiesUpdate: (remaining: number, total: number) => void;
  onAmmoUpdate: (remaining: number, max: number) => void;
  onBulletStateChange: (hasActiveBullets: boolean) => void;
  isPaused: boolean;
}

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  onVictory,
  onDefeat,
  onTimeUpdate,
  onEnemiesUpdate,
  onAmmoUpdate,
  onBulletStateChange,
  isPaused
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store callbacks in ref to protect 60fps simulation from React re-renders
  const callbacksRef = useRef({
    onVictory,
    onDefeat,
    onTimeUpdate,
    onEnemiesUpdate,
    onAmmoUpdate,
    onBulletStateChange
  });
  callbacksRef.current = {
    onVictory,
    onDefeat,
    onTimeUpdate,
    onEnemiesUpdate,
    onAmmoUpdate,
    onBulletStateChange
  };

  // Simulation references
  const playerRef = useRef<Ragdoll | null>(null);
  const enemiesRef = useRef<Ragdoll[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<ParticleEffect[]>([]);
  const comicTextsRef = useRef<ComicPopText[]>([]);
  const debrisRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; color: string; rot: number; vrot: number }[]>([]);

  const ammoRemainingRef = useRef<number>(level.ammoCount ?? 3);
  const bulletsFiredCountRef = useRef<number>(0);
  const totalBouncesRef = useRef<number>(0);
  const aimAngleRef = useRef<number>(level.playerAimHintAngle ?? -0.5);
  const mousePosRef = useRef<Vector2D>({ x: 400, y: 200 });
  const screenShakeRef = useRef<number>(0);
  const hitstopFramesRef = useRef<number>(0);
  const gameOverHandledRef = useRef<boolean>(false);
  const recoilOffsetRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastReportedTimeRef = useRef<number>(4.0);

  // Spawn visual comic onomatopoeia text
  const addComicText = (text: string, x: number, y: number, color: string = '#F4E8C1') => {
    comicTextsRef.current.push({
      id: Math.random().toString(),
      text,
      x: x + (Math.random() - 0.5) * 20,
      y: y - 10,
      vx: (Math.random() - 0.5) * 40,
      vy: -70 - Math.random() * 40,
      scale: 1.4,
      rotation: (Math.random() - 0.5) * 0.35,
      color,
      bgColor: '#181A1F',
      alpha: 1.0,
      life: 0,
      maxLife: 0.65
    });
  };

  // Initialize or reset level simulation
  const initLevel = useCallback(() => {
    gameOverHandledRef.current = false;
    bulletsRef.current = [];
    particlesRef.current = [];
    comicTextsRef.current = [];
    debrisRef.current = [];
    screenShakeRef.current = 0;
    hitstopFramesRef.current = 0;
    recoilOffsetRef.current = 0;
    lastReportedTimeRef.current = 4.0;
    totalBouncesRef.current = 0;
    bulletsFiredCountRef.current = 0;
    ammoRemainingRef.current = level.ammoCount ?? 3;

    // Build Player Ragdoll firmly planted on floor
    playerRef.current = createRagdoll(
      'player',
      level.playerPos.x,
      level.playerPos.y,
      true,
      'Tireur Solitaire',
      1
    );

    // Build Enemy Ragdolls
    enemiesRef.current = level.enemies.map((e, idx) =>
      createRagdoll(
        `enemy-${idx}`,
        e.x,
        e.y,
        false,
        e.name,
        e.facing ?? -1,
        e.color
      )
    );

    // Deep clone obstacles so modifications (broken ropes, smashed crates) don't bleed
    obstaclesRef.current = level.obstacles.map(o => ({
      ...o,
      doorConfig: o.doorConfig ? { ...o.doorConfig } : undefined,
      movingConfig: o.movingConfig ? { ...o.movingConfig } : undefined,
      portalConfig: o.portalConfig ? { ...o.portalConfig } : undefined,
      ropeConfig: o.ropeConfig ? { ...o.ropeConfig } : undefined
    }));

    aimAngleRef.current = level.playerAimHintAngle ?? -0.5;
    callbacksRef.current.onTimeUpdate(MAX_BULLET_TIME);
    callbacksRef.current.onAmmoUpdate(ammoRemainingRef.current, level.ammoCount ?? 3);
    callbacksRef.current.onEnemiesUpdate(enemiesRef.current.length, level.enemies.length);
    callbacksRef.current.onBulletStateChange(false);
  }, [level]);

  useEffect(() => {
    initLevel();
  }, [initLevel]);

  // Fire bullet handler (supports multiple bullets from ammo reserve!)
  const fireBullet = useCallback(() => {
    if (gameOverHandledRef.current) return;
    if (!playerRef.current || !playerRef.current.isAlive) return;

    if (ammoRemainingRef.current <= 0) {
      sounds.playEmptyClick();
      if (playerRef.current) {
        addComicText("CLIC !", playerRef.current.particles[0].x, playerRef.current.particles[0].y - 30, '#94A3B8');
      }
      return;
    }

    ammoRemainingRef.current -= 1;
    bulletsFiredCountRef.current += 1;
    callbacksRef.current.onAmmoUpdate(ammoRemainingRef.current, level.ammoCount ?? 3);

    const playerHead = playerRef.current.particles[0];
    const gunX = playerHead.x + Math.cos(aimAngleRef.current) * 34;
    const gunY = playerHead.y + Math.sin(aimAngleRef.current) * 34;

    const newBullet: Bullet = {
      id: Math.random().toString(),
      x: gunX,
      y: gunY,
      vx: Math.cos(aimAngleRef.current) * BULLET_SPEED,
      vy: Math.sin(aimAngleRef.current) * BULLET_SPEED,
      radius: 6,
      active: true,
      timeLeft: MAX_BULLET_TIME,
      bounces: 0,
      trail: []
    };

    bulletsRef.current.push(newBullet);
    sounds.playGunshot();
    screenShakeRef.current = 8;
    recoilOffsetRef.current = 6;
    callbacksRef.current.onBulletStateChange(true);

    addComicText("BANG !", gunX + Math.cos(aimAngleRef.current) * 20, gunY + Math.sin(aimAngleRef.current) * 20, '#FACC15');

    // Muzzle flash particles
    for (let i = 0; i < 12; i++) {
      const spread = (Math.random() - 0.5) * 0.7;
      const speed = Math.random() * 240 + 100;
      particlesRef.current.push({
        x: gunX,
        y: gunY,
        vx: Math.cos(aimAngleRef.current + spread) * speed,
        vy: Math.sin(aimAngleRef.current + spread) * speed,
        size: Math.random() * 4 + 2,
        color: '#E2E8F0',
        alpha: 1,
        life: 0,
        maxLife: 0.16,
        type: 'spark'
      });
    }
  }, [level.ammoCount]);

  // Mouse & Touch aiming listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      const canvasX = (clientX - rect.left) * scaleX;
      const canvasY = (clientY - rect.top) * scaleY;

      mousePosRef.current = { x: canvasX, y: canvasY };

      if (playerRef.current && playerRef.current.isAlive) {
        const head = playerRef.current.particles[0];
        const dx = canvasX - head.x;
        const dy = canvasY - head.y;
        aimAngleRef.current = Math.atan2(dy, dx);
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      handlePointerMove(e);
      fireBullet();
    };

    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('touchmove', handlePointerMove, { passive: true });
    canvas.addEventListener('touchstart', handlePointerDown, { passive: true });

    return () => {
      canvas.removeEventListener('mousemove', handlePointerMove);
      canvas.removeEventListener('mousedown', handlePointerDown);
      canvas.removeEventListener('touchmove', handlePointerMove);
      canvas.removeEventListener('touchstart', handlePointerDown);
    };
  }, [fireBullet]);

  // Main 60fps simulation and rendering loop
  useEffect(() => {
    let animId: number;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      const dt = Math.min(rawDt, 0.05);

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(loop);
        return;
      }

      if (hitstopFramesRef.current > 0) {
        hitstopFramesRef.current--;
        renderScene(ctx);
        animId = requestAnimationFrame(loop);
        return;
      }

      if (!isPaused) {
        updateSimulation(dt);
      }

      renderScene(ctx);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPaused]);

  // ----------------------------------------------------
  // Physics & Logic Simulation
  // ----------------------------------------------------
  const updateSimulation = (dt: number) => {
    // 1. Screen shake & recoil decay
    if (screenShakeRef.current > 0) {
      screenShakeRef.current *= 0.88;
      if (screenShakeRef.current < 0.2) screenShakeRef.current = 0;
    }
    if (recoilOffsetRef.current > 0) {
      recoilOffsetRef.current *= 0.82;
      if (recoilOffsetRef.current < 0.1) recoilOffsetRef.current = 0;
    }

    // 2. Update moving obstacles & bouncer squashes
    for (const obs of obstaclesRef.current) {
      if (obs.type === 'moving_platform' && obs.movingConfig) {
        const mc = obs.movingConfig;
        if (mc.axis === 'y') {
          obs.y += mc.speed * mc.currentDir * dt;
          if (obs.y > mc.max) {
            obs.y = mc.max;
            mc.currentDir = -1;
          } else if (obs.y < mc.min) {
            obs.y = mc.min;
            mc.currentDir = 1;
          }
        }
      }

      // Sliding blast doors
      if (obs.type === 'door' && obs.doorConfig) {
        const dc = obs.doorConfig;
        if (dc.isOpen && obs.height > dc.openHeight) {
          obs.height -= dc.openSpeed * dt;
          if (obs.height < 10) obs.height = 0;
        }
      }

      // Bouncer squash decay
      if (obs.bouncerSquash && obs.bouncerSquash > 0) {
        obs.bouncerSquash *= 0.85;
        if (obs.bouncerSquash < 0.05) obs.bouncerSquash = 0;
      }
    }

    // 3. Update Pendulum Rope Weights
    updateRopeWeights(
      obstaclesRef.current,
      dt,
      [...(playerRef.current ? [playerRef.current] : []), ...enemiesRef.current],
      CANVAS_HEIGHT,
      (crushedRagdoll, cx, cy) => {
        sounds.playRagdollHit();
        addComicText("CRUSH !", cx, cy, '#EF4444');
        const aliveCount = enemiesRef.current.filter(e => e.isAlive).length;
        callbacksRef.current.onEnemiesUpdate(aliveCount, level.enemies.length);
        if (crushedRagdoll.isPlayer && !gameOverHandledRef.current) {
          gameOverHandledRef.current = true;
          setTimeout(() => {
            sounds.playDefeat();
            callbacksRef.current.onDefeat("Écrasé par le rocher ! Attention aux poids suspendus !");
          }, 600);
        }
      }
    );

    // 4. Update Bullets (Multi-bullet array)
    const activeBullets = bulletsRef.current.filter(b => b.active);
    callbacksRef.current.onBulletStateChange(activeBullets.length > 0);

    // Minimum time left among active bullets for HUD
    if (activeBullets.length > 0) {
      const minTimeLeft = Math.min(...activeBullets.map(b => b.timeLeft));
      if (Math.abs(lastReportedTimeRef.current - minTimeLeft) >= 0.06 || minTimeLeft <= 0) {
        lastReportedTimeRef.current = minTimeLeft;
        callbacksRef.current.onTimeUpdate(Math.max(0, minTimeLeft));
      }
    } else {
      callbacksRef.current.onTimeUpdate(MAX_BULLET_TIME);
    }

    for (const bullet of activeBullets) {
      bullet.timeLeft -= dt;

      // Motion trail
      bullet.trail.unshift({ x: bullet.x, y: bullet.y, alpha: 1.0 });
      if (bullet.trail.length > 18) bullet.trail.pop();

      // Continuous collision substeps
      const subSteps = 6;
      const subDt = dt / subSteps;

      for (let step = 0; step < subSteps; step++) {
        bullet.x += bullet.vx * subDt;
        bullet.y += bullet.vy * subDt;

        // Room boundaries bounce
        const margin = 20;
        if (bullet.x - bullet.radius < margin) {
          bullet.x = margin + bullet.radius;
          bullet.vx = Math.abs(bullet.vx);
          triggerBounce(bullet, bullet.x, bullet.y, 'PING !');
        } else if (bullet.x + bullet.radius > CANVAS_WIDTH - margin) {
          bullet.x = CANVAS_WIDTH - margin - bullet.radius;
          bullet.vx = -Math.abs(bullet.vx);
          triggerBounce(bullet, bullet.x, bullet.y, 'PING !');
        }

        if (bullet.y - bullet.radius < margin) {
          bullet.y = margin + bullet.radius;
          bullet.vy = Math.abs(bullet.vy);
          triggerBounce(bullet, bullet.x, bullet.y, 'PING !');
        } else if (bullet.y + bullet.radius > CANVAS_HEIGHT - margin) {
          bullet.y = CANVAS_HEIGHT - margin - bullet.radius;
          bullet.vy = -Math.abs(bullet.vy);
          triggerBounce(bullet, bullet.x, bullet.y, 'PING !');
        }

        // Check Obstacle collisions
        for (const obs of obstaclesRef.current) {
          if (obs.isDestroyed || (obs.type === 'door' && obs.doorConfig?.isOpen && obs.height === 0)) continue;

          // Rope cut check
          if (obs.type === 'rope_weight' && obs.ropeConfig && !obs.ropeConfig.isCut) {
            const rope = obs.ropeConfig;
            const hit = raySegmentIntersect(
              bullet.x - bullet.vx * subDt,
              bullet.y - bullet.vy * subDt,
              bullet.vx * subDt,
              bullet.vy * subDt,
              rope.anchorX,
              rope.anchorY,
              rope.ballX,
              rope.ballY
            );
            if (hit) {
              rope.isCut = true;
              sounds.playRopeCut();
              addComicText("TRANCHÉ !", bullet.x, bullet.y, '#F59E0B');
              screenShakeRef.current = 6;
              break;
            }
          }

          // Portal teleportation
          if (obs.type === 'portal' && obs.portalConfig) {
            if (
              bullet.x >= obs.x &&
              bullet.x <= obs.x + obs.width &&
              bullet.y >= obs.y &&
              bullet.y <= obs.y + obs.height
            ) {
              const pair = obstaclesRef.current.find(o => o.id === obs.portalConfig?.pairId);
              if (pair && pair.portalConfig) {
                const speed = Math.hypot(bullet.vx, bullet.vy);
                bullet.x = pair.x + pair.width / 2 + pair.portalConfig.exitDirX * 22;
                bullet.y = pair.y + pair.height / 2 + pair.portalConfig.exitDirY * 22;
                bullet.vx = pair.portalConfig.exitDirX * speed;
                bullet.vy = pair.portalConfig.exitDirY * speed;
                sounds.playPortalWarp();
                addComicText("WARP !", pair.x, pair.y - 10, '#38BDF8');
                screenShakeRef.current = 4;
                break;
              }
            }
            continue;
          }

          // Glass pane (shatters instantly, bullet keeps travelling!)
          if (obs.type === 'glass' && !obs.isDestroyed) {
            if (
              bullet.x + bullet.radius >= obs.x &&
              bullet.x - bullet.radius <= obs.x + obs.width &&
              bullet.y + bullet.radius >= obs.y &&
              bullet.y - bullet.radius <= obs.y + obs.height
            ) {
              obs.isDestroyed = true;
              sounds.playGlassShatter();
              addComicText("CRASH !", bullet.x, bullet.y, '#38BDF8');
              screenShakeRef.current = 6;
              spawnGlassShards(obs.x + obs.width / 2, obs.y + obs.height / 2);
              continue;
            }
          }

          // Standard AABB Obstacles
          const left = obs.x;
          const right = obs.x + obs.width;
          const top = obs.y;
          const bottom = obs.y + obs.height;

          const closeX = Math.max(left, Math.min(bullet.x, right));
          const closeY = Math.max(top, Math.min(bullet.y, bottom));

          const dx = bullet.x - closeX;
          const dy = bullet.y - closeY;
          const dist = Math.hypot(dx, dy);

          if (dist < bullet.radius) {
            let nx = dx / (dist || 1);
            let ny = dy / (dist || 1);
            if (dist === 0) {
              nx = 0;
              ny = -1;
            }

            bullet.x = closeX + nx * (bullet.radius + 1);
            bullet.y = closeY + ny * (bullet.radius + 1);

            // Bouncer bumper has high elasticity and BOING! sound
            if (obs.type === 'bouncer') {
              const dot = bullet.vx * nx + bullet.vy * ny;
              bullet.vx = (bullet.vx - 2 * dot * nx) * 1.15;
              bullet.vy = (bullet.vy - 2 * dot * ny) * 1.15;
              obs.bouncerSquash = 1.0;
              sounds.playBoing();
              addComicText("BOING !", bullet.x, bullet.y, '#C084FC');
              triggerBounce(bullet, bullet.x, bullet.y, '');
              break;
            }

            // Normal reflection
            const dot = bullet.vx * nx + bullet.vy * ny;
            bullet.vx = (bullet.vx - 2 * dot * nx) * 0.99;
            bullet.vy = (bullet.vy - 2 * dot * ny) * 0.99;

            triggerBounce(bullet, bullet.x, bullet.y, 'BING !');

            if (obs.type === 'switch' && !obs.isTriggered) {
              obs.isTriggered = true;
              obs.color = '#4ADE80';
              sounds.playSwitchTrigger();
              addComicText("CLIC !", obs.x, obs.y - 12, '#4ADE80');
              screenShakeRef.current = 6;

              const door = obstaclesRef.current.find(o => o.targetSwitchId === obs.id);
              if (door && door.doorConfig) door.doorConfig.isOpen = true;
            } else if (obs.type === 'destructible') {
              obs.health = (obs.health ?? 1) - 1;
              sounds.playDestruction();
              addComicText("CRAC !", obs.x, obs.y - 12, '#F59E0B');
              spawnDebris(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.color || '#9C683B', 8);
              if (obs.health <= 0) {
                obs.isDestroyed = true;
                screenShakeRef.current = 8;
              }
            } else if (obs.type === 'explosive_barrel' && !obs.isDestroyed) {
              detonateBarrel(obs);
            }

            break;
          }
        }

        // Check collision with Player Ragdoll (SELF-HIT AFTER AT LEAST 1 BOUNCE)
        if (playerRef.current && playerRef.current.isAlive) {
          for (let pIdx = 0; pIdx < playerRef.current.particles.length; pIdx++) {
            const part = playerRef.current.particles[pIdx];
            const dx = bullet.x - part.x;
            const dy = bullet.y - part.y;
            const dist = Math.hypot(dx, dy);

            if (dist < bullet.radius + part.radius && bullet.bounces >= 1 && (MAX_BULLET_TIME - bullet.timeLeft > 0.25)) {
              applyImpulseToRagdoll(
                playerRef.current,
                bullet.x,
                bullet.y,
                bullet.vx * 1.5,
                bullet.vy * 1.5,
                pIdx
              );
              sounds.playRagdollHit();
              bullet.active = false;
              addComicText("AÏE !", part.x, part.y, '#EF4444');
              hitstopFramesRef.current = 4;
              screenShakeRef.current = 14;

              if (!gameOverHandledRef.current) {
                gameOverHandledRef.current = true;
                setTimeout(() => {
                  sounds.playDefeat();
                  callbacksRef.current.onDefeat("Mort par ricochet ! Tu as été percuté par ta propre balle !");
                }, 600);
              }
              break;
            }
          }
        }

        // Check collision with Enemy Ragdolls
        for (const enemy of enemiesRef.current) {
          if (!enemy.isAlive) continue;

          for (let pIdx = 0; pIdx < enemy.particles.length; pIdx++) {
            const part = enemy.particles[pIdx];
            const dx = bullet.x - part.x;
            const dy = bullet.y - part.y;
            const dist = Math.hypot(dx, dy);

            if (dist < bullet.radius + part.radius) {
              applyImpulseToRagdoll(
                enemy,
                bullet.x,
                bullet.y,
                bullet.vx * 1.3,
                bullet.vy * 1.3,
                pIdx
              );

              sounds.playRagdollHit();
              addComicText("POW !", part.x, part.y, '#FBBF24');
              hitstopFramesRef.current = 3;
              screenShakeRef.current = 10;
              spawnHitStars(part.x, part.y);

              const aliveCount = enemiesRef.current.filter(e => e.isAlive).length;
              callbacksRef.current.onEnemiesUpdate(aliveCount, level.enemies.length);

              bullet.vx *= 0.88;
              bullet.vy *= 0.88;
              break;
            }
          }
        }
      }

      // Check single bullet expiration
      if (bullet.timeLeft <= 0) {
        bullet.active = false;
        bullet.timeLeft = 0;
      }
    }

    // 5. Update Ragdolls
    const bulletPositions = activeBullets.map(b => ({ x: b.x, y: b.y }));
    if (playerRef.current) {
      updateRagdoll(playerRef.current, dt, obstaclesRef.current, CANVAS_WIDTH, CANVAS_HEIGHT, activeBullets.length > 0, bulletPositions);
    }
    for (const enemy of enemiesRef.current) {
      updateRagdoll(enemy, dt, obstaclesRef.current, CANVAS_WIDTH, CANVAS_HEIGHT, activeBullets.length > 0, bulletPositions);
    }

    // 6. Check Victory / Defeat Conditions across all bullets
    const remainingAlive = enemiesRef.current.filter(e => e.isAlive).length;
    if (remainingAlive === 0 && !gameOverHandledRef.current) {
      handleVictory();
    } else if (
      ammoRemainingRef.current === 0 &&
      activeBullets.length === 0 &&
      remainingAlive > 0 &&
      !gameOverHandledRef.current
    ) {
      gameOverHandledRef.current = true;
      sounds.playDefeat();
      callbacksRef.current.onDefeat(`Plus de munitions ! Il reste ${remainingAlive} ennemi(s) en vie.`);
    }

    // 7. Update Debris particles
    for (let i = debrisRef.current.length - 1; i >= 0; i--) {
      const d = debrisRef.current[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 700 * dt;
      d.rot += d.vrot * dt;

      // Debris knocking out enemies
      if (Math.hypot(d.vx, d.vy) > 160) {
        for (const enemy of enemiesRef.current) {
          if (!enemy.isAlive) continue;
          for (let pIdx = 0; pIdx < enemy.particles.length; pIdx++) {
            const part = enemy.particles[pIdx];
            if (Math.hypot(d.x - part.x, d.y - part.y) < d.size + part.radius) {
              applyImpulseToRagdoll(enemy, d.x, d.y, d.vx * 0.8, d.vy * 0.8, pIdx);
              sounds.playRagdollHit();
              addComicText("CLANG !", part.x, part.y, '#94A3B8');
              spawnHitStars(part.x, part.y);
              const aliveCount = enemiesRef.current.filter(e => e.isAlive).length;
              callbacksRef.current.onEnemiesUpdate(aliveCount, level.enemies.length);
              break;
            }
          }
        }
      }

      if (d.y > CANVAS_HEIGHT - 25) {
        d.y = CANVAS_HEIGHT - 25;
        d.vy = -d.vy * 0.35;
        d.vx *= 0.6;
      }
      d.vx *= 0.98;
      if (Math.hypot(d.vx, d.vy) < 10 && d.y >= CANVAS_HEIGHT - 26) {
        debrisRef.current.splice(i, 1);
      }
    }

    // 8. Update Comic Texts
    for (let i = comicTextsRef.current.length - 1; i >= 0; i--) {
      const ct = comicTextsRef.current[i];
      ct.life += dt;
      ct.x += ct.vx * dt;
      ct.y += ct.vy * dt;
      ct.scale = Math.max(1.0, 1.4 - (ct.life / ct.maxLife) * 0.4);
      ct.alpha = 1 - ct.life / ct.maxLife;

      if (ct.life >= ct.maxLife) {
        comicTextsRef.current.splice(i, 1);
      }
    }

    // 9. Update Visual Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = 1 - p.life / p.maxLife;

      if (p.life >= p.maxLife) {
        particlesRef.current.splice(i, 1);
      }
    }
  };

  const handleVictory = () => {
    if (gameOverHandledRef.current) return;
    gameOverHandledRef.current = true;
    sounds.playVictory();
    const timeUsed = 4.0;
    setTimeout(() => {
      callbacksRef.current.onVictory({
        timeUsed,
        bounces: totalBouncesRef.current,
        bulletsUsed: bulletsFiredCountRef.current
      });
    }, 700);
  };

  const triggerBounce = (bullet: Bullet, x: number, y: number, comicWord: string) => {
    bullet.bounces++;
    totalBouncesRef.current++;
    sounds.playRicochet(bullet.bounces);
    screenShakeRef.current = Math.min(screenShakeRef.current + 2, 7);

    if (comicWord && Math.random() < 0.45) {
      addComicText(comicWord, x, y - 8, '#FDE047');
    }

    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 160 + 60;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color: '#FDE047',
        alpha: 1,
        life: 0,
        maxLife: 0.2,
        type: 'spark'
      });
    }
  };

  const detonateBarrel = (barrel: Obstacle) => {
    barrel.isDestroyed = true;
    sounds.playExplosion();
    screenShakeRef.current = 16;
    hitstopFramesRef.current = 3;

    const bx = barrel.x + barrel.width / 2;
    const by = barrel.y + barrel.height / 2;

    addComicText("KABOOM !", bx, by - 20, '#EF4444');

    const explosionRadius = 180;
    const allRagdolls = [...(playerRef.current ? [playerRef.current] : []), ...enemiesRef.current];

    for (const rag of allRagdolls) {
      const torso = rag.particles[1];
      const dx = torso.x - bx;
      const dy = torso.y - by;
      const dist = Math.hypot(dx, dy);

      if (dist < explosionRadius) {
        const power = (1 - dist / explosionRadius) * 2600;
        const angle = Math.atan2(dy, dx);
        applyImpulseToRagdoll(
          rag,
          bx,
          by,
          Math.cos(angle) * power,
          Math.sin(angle) * power - 400
        );

        if (rag.isPlayer && !gameOverHandledRef.current) {
          gameOverHandledRef.current = true;
          setTimeout(() => {
            sounds.playDefeat();
            callbacksRef.current.onDefeat("Explosion fatale ! Le baril t'a soufflé !");
          }, 600);
        }
      }
    }

    spawnDebris(bx, by, '#8A2BE2', 12);
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 240 + 70;
      particlesRef.current.push({
        x: bx,
        y: by,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 90,
        size: Math.random() * 7 + 3,
        color: Math.random() > 0.5 ? '#E2E8F0' : '#475569',
        alpha: 1,
        life: 0,
        maxLife: 0.45,
        type: 'smoke'
      });
    }

    const aliveCount = enemiesRef.current.filter(e => e.isAlive).length;
    callbacksRef.current.onEnemiesUpdate(aliveCount, level.enemies.length);
  };

  const spawnDebris = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 260 + 80;
      debrisRef.current.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        size: Math.random() * 9 + 5,
        color,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 10
      });
    }
  };

  const spawnGlassShards = (x: number, y: number) => {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 220 + 80;
      debrisRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        size: Math.random() * 7 + 3,
        color: '#E0F2FE',
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 16
      });
    }
  };

  const spawnHitStars = (x: number, y: number) => {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size: Math.random() * 5 + 3,
        color: '#FACC15',
        alpha: 1,
        life: 0,
        maxLife: 0.35,
        type: 'star'
      });
    }
  };

  // ----------------------------------------------------
  // Scene Rendering (Clean Cartoon Inked Graphic Style)
  // ----------------------------------------------------
  const renderScene = (ctx: CanvasRenderingContext2D) => {
    ctx.save();

    // Camera shake & recoil offset
    if (screenShakeRef.current > 0 || recoilOffsetRef.current > 0) {
      const shakeX = (Math.random() - 0.5) * screenShakeRef.current * 1.4 - Math.cos(aimAngleRef.current) * recoilOffsetRef.current;
      const shakeY = (Math.random() - 0.5) * screenShakeRef.current * 1.4 - Math.sin(aimAngleRef.current) * recoilOffsetRef.current;
      ctx.translate(shakeX, shakeY);
    }

    // Background: Inked Muted Charcoal Blueprint
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#1E232B');
    bgGrad.addColorStop(1, '#15181E');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle Comic Halftone Dot Matrix / Grid
    ctx.fillStyle = 'rgba(74, 85, 104, 0.18)';
    for (let x = 30; x < CANVAS_WIDTH; x += 30) {
      for (let y = 30; y < CANVAS_HEIGHT; y += 30) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Outer inked comic frame
    ctx.strokeStyle = '#0F1216';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 40);

    // Steel Floor with Inked Comic Hatching
    const floorY = CANVAS_HEIGHT - 20;
    ctx.fillStyle = '#2A303C';
    ctx.fillRect(20, floorY - 8, CANVAS_WIDTH - 40, 28);
    ctx.strokeStyle = '#0F1216';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, floorY - 8, CANVAS_WIDTH - 40, 28);

    // Render Obstacles
    for (const obs of obstaclesRef.current) {
      if (obs.isDestroyed) continue;
      renderObstacle(ctx, obs);
    }

    // Render Laser Aiming Guide (if player is alive)
    if (playerRef.current && playerRef.current.isAlive && ammoRemainingRef.current > 0) {
      renderLaserGuide(ctx);
    }

    // Render Debris
    for (const d of debrisRef.current) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillStyle = d.color;
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 2.5;
      ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
      ctx.strokeRect(-d.size / 2, -d.size / 2, d.size, d.size);
      ctx.restore();
    }

    // Render Ragdolls (Inked cartoon style)
    if (playerRef.current) renderRagdoll(ctx, playerRef.current);
    for (const enemy of enemiesRef.current) renderRagdoll(ctx, enemy);

    // Render Active Bullets
    for (const bullet of bulletsRef.current) {
      if (bullet.active) renderBullet(ctx, bullet);
    }

    // Render Particles
    for (const p of particlesRef.current) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.type === 'star') {
        const r = p.size;
        ctx.moveTo(p.x, p.y - r);
        ctx.lineTo(p.x + r * 0.3, p.y - r * 0.3);
        ctx.lineTo(p.x + r, p.y);
        ctx.lineTo(p.x + r * 0.3, p.y + r * 0.3);
        ctx.lineTo(p.x, p.y + r);
        ctx.lineTo(p.x - r * 0.3, p.y + r * 0.3);
        ctx.lineTo(p.x - r, p.y);
        ctx.lineTo(p.x - r * 0.3, p.y - r * 0.3);
        ctx.closePath();
      } else {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }

    // Render Comic Pop Texts (Onomatopoeias)
    for (const ct of comicTextsRef.current) {
      ctx.save();
      ctx.globalAlpha = ct.alpha;
      ctx.translate(ct.x, ct.y);
      ctx.rotate(ct.rotation);
      ctx.scale(ct.scale, ct.scale);

      ctx.font = '900 16px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Comic black ink shadow
      ctx.fillStyle = '#0F1216';
      ctx.fillText(ct.text, 2, 2);

      // Lettering outline
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 4;
      ctx.strokeText(ct.text, 0, 0);

      // Fill
      ctx.fillStyle = ct.color;
      ctx.fillText(ct.text, 0, 0);

      ctx.restore();
    }

    ctx.restore();
  };

  const renderObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle) => {
    ctx.save();

    if (obs.type === 'wall' || obs.type === 'moving_platform') {
      ctx.fillStyle = obs.color || '#374151';
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 3;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

      // Comic hatch lines
      ctx.strokeStyle = 'rgba(15, 18, 22, 0.4)';
      ctx.lineWidth = 1.5;
      for (let y = obs.y + 10; y < obs.y + obs.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(obs.x + 4, y);
        ctx.lineTo(obs.x + obs.width - 4, y - 6);
        ctx.stroke();
      }
    } else if (obs.type === 'destructible') {
      ctx.fillStyle = obs.color || '#9C683B';
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 3;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

      // Wood cross
      ctx.beginPath();
      ctx.moveTo(obs.x + 4, obs.y + 4);
      ctx.lineTo(obs.x + obs.width - 4, obs.y + obs.height - 4);
      ctx.moveTo(obs.x + obs.width - 4, obs.y + 4);
      ctx.lineTo(obs.x + 4, obs.y + obs.height - 4);
      ctx.stroke();
    } else if (obs.type === 'explosive_barrel') {
      ctx.fillStyle = '#993026';
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 5);
      ctx.fill();
      ctx.stroke();

      // Yellow caution stencil
      ctx.fillStyle = '#EAB308';
      ctx.fillRect(obs.x + 2, obs.y + 10, obs.width - 4, 6);
      ctx.fillRect(obs.x + 2, obs.y + obs.height - 16, obs.width - 4, 6);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = '900 12px "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TNT', obs.x + obs.width / 2, obs.y + obs.height / 2);
    } else if (obs.type === 'portal') {
      // Swirling comic vortex portal
      ctx.strokeStyle = obs.color || '#3B82F6';
      ctx.lineWidth = 4;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner spiral ring
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 4, obs.height / 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (obs.type === 'glass') {
      // Translucent light blue pane with comic reflection highlights
      ctx.fillStyle = 'rgba(125, 211, 252, 0.25)';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

      // Angled glint line
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(obs.x + 2, obs.y + 20);
      ctx.lineTo(obs.x + obs.width - 2, obs.y + 60);
      ctx.stroke();
    } else if (obs.type === 'bouncer') {
      // Rubber spring bumper with squash animation
      const squash = obs.bouncerSquash || 0;
      ctx.save();
      ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
      ctx.scale(1 + squash * 0.3, 1 - squash * 0.3);

      ctx.fillStyle = '#7C3AED';
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height, 8);
      ctx.fill();
      ctx.stroke();

      // Spring zigzag stripes
      ctx.strokeStyle = '#DDD6FE';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-obs.width / 3, -obs.height / 3);
      ctx.lineTo(obs.width / 3, 0);
      ctx.lineTo(-obs.width / 3, obs.height / 3);
      ctx.stroke();
      ctx.restore();
    } else if (obs.type === 'hazard_spikes') {
      // Metal sharp spikes
      ctx.fillStyle = '#64748B';
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 2;
      const spikeW = 14;
      const count = Math.floor(obs.width / spikeW);
      for (let i = 0; i < count; i++) {
        const sx = obs.x + i * spikeW;
        ctx.beginPath();
        ctx.moveTo(sx, obs.y + obs.height);
        ctx.lineTo(sx + spikeW / 2, obs.y);
        ctx.lineTo(sx + spikeW, obs.y + obs.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (obs.type === 'rope_weight' && obs.ropeConfig) {
      const rope = obs.ropeConfig;
      // Anchor bracket
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 3;
      ctx.fillRect(rope.anchorX - 10, rope.anchorY - 8, 20, 10);
      ctx.strokeRect(rope.anchorX - 10, rope.anchorY - 8, 20, 10);

      // Rope strand (if intact)
      if (!rope.isCut) {
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(rope.anchorX, rope.anchorY);
        ctx.lineTo(rope.ballX, rope.ballY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Heavy Iron Wrecking Ball
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(rope.ballX, rope.ballY, rope.ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Comic metallic rim highlight
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rope.ballX - 6, rope.ballY - 6, rope.ballRadius * 0.6, Math.PI * 0.8, Math.PI * 1.6);
      ctx.stroke();
    } else if (obs.type === 'switch') {
      ctx.fillStyle = obs.isTriggered ? '#22C55E' : '#D4A325';
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0F1216';
      ctx.beginPath();
      ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (obs.type === 'door') {
      ctx.fillStyle = '#3F444C';
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 3.5;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

      ctx.fillStyle = '#F59E0B';
      for (let y = obs.y + 6; y < obs.y + obs.height - 10; y += 22) {
        ctx.fillRect(obs.x + 4, y, obs.width - 8, 6);
      }
    }

    ctx.restore();
  };

  const renderLaserGuide = (ctx: CanvasRenderingContext2D) => {
    if (!playerRef.current) return;
    const head = playerRef.current.particles[0];
    const gunX = head.x + Math.cos(aimAngleRef.current) * 34;
    const gunY = head.y + Math.sin(aimAngleRef.current) * 34;

    const path = calculateLaserPath(
      gunX,
      gunY,
      aimAngleRef.current,
      obstaclesRef.current,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      3
    );

    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    for (let i = 1; i < path.length; i++) {
      ctx.setLineDash([]);
      ctx.fillStyle = '#F87171';
      ctx.beginPath();
      ctx.arc(path[i].x, path[i].y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  const renderRagdoll = (ctx: CanvasRenderingContext2D, ragdoll: Ragdoll) => {
    ctx.save();

    // 1. Inked Bones / Limbs
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    for (const joint of ragdoll.joints) {
      if (joint.broken) continue;
      const p1 = ragdoll.particles[joint.p1Index];
      const p2 = ragdoll.particles[joint.p2Index];

      const isLeg = joint.name?.includes('Leg') || joint.name?.includes('Hip') || joint.name === 'pelvis';
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = isLeg ? 10 : 8;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Inner color line
      ctx.strokeStyle = isLeg ? ragdoll.color.pants : ragdoll.color.shirt;
      ctx.lineWidth = isLeg ? 6 : 5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // 2. Limb Ends (Hands & Shoes)
    for (const p of ragdoll.particles) {
      if (p.isLimb) {
        ctx.fillStyle = p.name.includes('Leg') ? '#1E232B' : ragdoll.color.skin;
        ctx.strokeStyle = '#0F1216';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // 3. Torso
    const torso = ragdoll.particles[1];
    ctx.fillStyle = ragdoll.color.shirt;
    ctx.strokeStyle = '#0F1216';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(torso.x, torso.y, torso.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. Player Revolver
    if (ragdoll.isPlayer && ragdoll.isAlive) {
      const head = ragdoll.particles[0];
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(aimAngleRef.current);
      // Steel barrel
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 2;
      ctx.fillRect(8, -4, 24, 7);
      ctx.strokeRect(8, -4, 24, 7);
      // Wood handle
      ctx.fillStyle = '#8B5A2B';
      ctx.fillRect(8, 0, 7, 10);
      ctx.strokeRect(8, 0, 7, 10);
      ctx.restore();
    }

    // 5. Head
    const head = ragdoll.particles[0];
    ctx.fillStyle = ragdoll.color.skin;
    ctx.strokeStyle = '#0F1216';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(head.x, head.y, head.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Comic Hat / Bowler
    if (ragdoll.color.hat) {
      ctx.fillStyle = ragdoll.color.hat;
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(head.x, head.y - 6, head.radius * 0.9, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(head.x - head.radius * 1.05, head.y - 7, head.radius * 2.1, 4);
      ctx.strokeRect(head.x - head.radius * 1.05, head.y - 7, head.radius * 2.1, 4);
    }

    // Comic Eyes
    const eyeOffsetX = 4 * ragdoll.facing;
    const eyeY = head.y - 1;

    if (ragdoll.eyeState === 'dead') {
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 2.5;
      // Eye 1 (X)
      ctx.beginPath();
      ctx.moveTo(head.x + eyeOffsetX - 4, eyeY - 3);
      ctx.lineTo(head.x + eyeOffsetX, eyeY + 1);
      ctx.moveTo(head.x + eyeOffsetX, eyeY - 3);
      ctx.lineTo(head.x + eyeOffsetX - 4, eyeY + 1);
      ctx.stroke();
      // Eye 2 (X)
      ctx.beginPath();
      ctx.moveTo(head.x + eyeOffsetX + 2, eyeY - 3);
      ctx.lineTo(head.x + eyeOffsetX + 6, eyeY + 1);
      ctx.moveTo(head.x + eyeOffsetX + 6, eyeY - 3);
      ctx.lineTo(head.x + eyeOffsetX + 2, eyeY + 1);
      ctx.stroke();
    } else if (ragdoll.eyeState === 'scared') {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#0F1216';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(head.x + eyeOffsetX - 2, eyeY, 4.5, 0, Math.PI * 2);
      ctx.arc(head.x + eyeOffsetX + 4, eyeY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F1216';
      ctx.beginPath();
      ctx.arc(head.x + eyeOffsetX - 2, eyeY, 1.5, 0, Math.PI * 2);
      ctx.arc(head.x + eyeOffsetX + 4, eyeY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#0F1216';
      ctx.beginPath();
      ctx.arc(head.x + eyeOffsetX - 2, eyeY, 2.5, 0, Math.PI * 2);
      ctx.arc(head.x + eyeOffsetX + 4, eyeY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  const renderBullet = (ctx: CanvasRenderingContext2D, bullet: Bullet) => {
    ctx.save();

    // Motion Trail with comic ink fading
    for (let i = 0; i < bullet.trail.length; i++) {
      const pt = bullet.trail[i];
      const alpha = (1 - i / bullet.trail.length) * 0.6;
      const radius = bullet.radius * (1 - (i / bullet.trail.length) * 0.5);

      ctx.fillStyle = `rgba(245, 158, 11, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heavy Brass Bullet with Comic Ink Outline
    ctx.fillStyle = '#FDE047';
    ctx.strokeStyle = '#0F1216';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  return (
    <div className="relative w-full aspect-video max-w-5xl mx-auto rounded-xl overflow-hidden shadow-2xl bg-slate-950 border border-slate-800 select-none cursor-crosshair">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full block"
      />
    </div>
  );
};
