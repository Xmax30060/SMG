/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GameState, LevelConfig } from './game/types';
import { LEVELS } from './game/levels';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { TitleScreen } from './components/TitleScreen';
import { VictoryDefeatModal } from './components/VictoryDefeatModal';
import { GDDDocumentModal } from './components/GDDDocumentModal';
import { sounds } from './game/audio';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(4.0);
  const [bulletActive, setBulletActive] = useState<boolean>(false);
  const [ammoRemaining, setAmmoRemaining] = useState<number>(LEVELS[0].ammoCount ?? 3);
  const [maxAmmo, setMaxAmmo] = useState<number>(LEVELS[0].ammoCount ?? 3);
  const [enemiesRemaining, setEnemiesRemaining] = useState<number>(LEVELS[0].enemies.length);
  const [totalEnemies, setTotalEnemies] = useState<number>(LEVELS[0].enemies.length);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isGDDOpen, setIsGDDOpen] = useState<boolean>(false);
  
  // End of round results
  const [roundResult, setRoundResult] = useState<{
    type: 'VICTORY' | 'GAME_OVER' | null;
    reason?: string;
    stats?: { timeUsed: number; bounces: number; bulletsUsed?: number };
  }>({ type: null });

  // Key to force reload GameCanvas on restart
  const [canvasKey, setCanvasKey] = useState<number>(0);

  const currentLevel: LevelConfig = LEVELS[currentLevelIndex] || LEVELS[0];

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      sounds.setMuted(next);
      return next;
    });
  }, []);

  const handleStartGame = () => {
    setGameState('PLAYING');
    setRoundResult({ type: null });
    setAmmoRemaining(currentLevel.ammoCount ?? 3);
    setMaxAmmo(currentLevel.ammoCount ?? 3);
    setCanvasKey(k => k + 1);
  };

  const handleRestart = useCallback(() => {
    setRoundResult({ type: null });
    setGameState('PLAYING');
    setTimeLeft(4.0);
    setBulletActive(false);
    setAmmoRemaining(currentLevel.ammoCount ?? 3);
    setMaxAmmo(currentLevel.ammoCount ?? 3);
    setCanvasKey(k => k + 1);
  }, [currentLevel.ammoCount]);

  const handleSelectLevel = (levelId: number) => {
    const idx = LEVELS.findIndex(l => l.id === levelId);
    if (idx !== -1) {
      setCurrentLevelIndex(idx);
      setRoundResult({ type: null });
      setGameState('PLAYING');
      setTimeLeft(4.0);
      setBulletActive(false);
      setAmmoRemaining(LEVELS[idx].ammoCount ?? 3);
      setMaxAmmo(LEVELS[idx].ammoCount ?? 3);
      setCanvasKey(k => k + 1);
    }
  };

  const handleNextLevel = () => {
    if (currentLevelIndex < LEVELS.length - 1) {
      handleSelectLevel(LEVELS[currentLevelIndex + 1].id);
    } else {
      handleSelectLevel(LEVELS[0].id);
    }
  };

  const handleVictory = useCallback((stats: { timeUsed: number; bounces: number; bulletsUsed: number }) => {
    setGameState('VICTORY');
    setRoundResult({
      type: 'VICTORY',
      stats
    });
  }, []);

  const handleDefeat = useCallback((reason: string) => {
    setGameState('GAME_OVER');
    setRoundResult({
      type: 'GAME_OVER',
      reason
    });
  }, []);

  const handleEnemiesUpdate = useCallback((rem: number, tot: number) => {
    setEnemiesRemaining(rem);
    setTotalEnemies(tot);
  }, []);

  const handleAmmoUpdate = useCallback((rem: number, max: number) => {
    setAmmoRemaining(rem);
    setMaxAmmo(max);
  }, []);

  // Keyboard controls: R to restart, M for mute, G for GDD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        if (gameState === 'PLAYING' || gameState === 'GAME_OVER' || gameState === 'VICTORY') {
          handleRestart();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (e.key === 'g' || e.key === 'G') {
        setIsGDDOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleRestart, handleToggleMute]);

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950">
      
      {/* Game Shell Container */}
      <div className="relative w-full max-w-5xl flex flex-col items-center">
        
        {gameState === 'TITLE' ? (
          <TitleScreen
            onStartGame={handleStartGame}
            onOpenGDD={() => setIsGDDOpen(true)}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        ) : (
          <div className="relative w-full aspect-video">
            {/* The 60fps Game Canvas */}
            <GameCanvas
              key={canvasKey}
              level={currentLevel}
              onVictory={handleVictory}
              onDefeat={handleDefeat}
              onTimeUpdate={setTimeLeft}
              onAmmoUpdate={handleAmmoUpdate}
              onEnemiesUpdate={handleEnemiesUpdate}
              onBulletStateChange={setBulletActive}
              isPaused={gameState === 'PAUSED'}
            />

            {/* In-Game HUD overlay */}
            <GameHUD
              currentLevel={currentLevel}
              allLevels={LEVELS}
              onSelectLevel={handleSelectLevel}
              onRestart={handleRestart}
              onOpenGDD={() => setIsGDDOpen(true)}
              timeLeft={timeLeft}
              bulletActive={bulletActive}
              ammoRemaining={ammoRemaining}
              maxAmmo={maxAmmo}
              enemiesRemaining={enemiesRemaining}
              totalEnemies={totalEnemies}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
            />
          </div>
        )}

        {/* Victory / Defeat Modal */}
        {(gameState === 'VICTORY' || gameState === 'GAME_OVER') && (
          <VictoryDefeatModal
            type={roundResult.type}
            reason={roundResult.reason}
            stats={roundResult.stats}
            hasNextLevel={currentLevelIndex < LEVELS.length - 1}
            onNextLevel={handleNextLevel}
            onRestart={handleRestart}
            onOpenGDD={() => setIsGDDOpen(true)}
          />
        )}

        {/* Game Design Document & Tech Spec Modal */}
        <GDDDocumentModal
          isOpen={isGDDOpen}
          onClose={() => setIsGDDOpen(false)}
        />

      </div>

    </div>
  );
}
