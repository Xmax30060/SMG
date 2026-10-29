/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, VolumeX, RotateCcw, BookOpen, Skull, Target, Flame } from 'lucide-react';
import { LevelConfig } from '../game/types';

interface GameHUDProps {
  currentLevel: LevelConfig;
  allLevels: LevelConfig[];
  onSelectLevel: (levelId: number) => void;
  onRestart: () => void;
  onOpenGDD: () => void;
  timeLeft: number;
  bulletActive: boolean;
  ammoRemaining: number;
  maxAmmo: number;
  enemiesRemaining: number;
  totalEnemies: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  currentLevel,
  allLevels,
  onSelectLevel,
  onRestart,
  onOpenGDD,
  timeLeft,
  bulletActive,
  ammoRemaining,
  maxAmmo,
  enemiesRemaining,
  totalEnemies,
  isMuted,
  onToggleMute
}) => {
  const isTimeCritical = bulletActive && timeLeft <= 1.5;
  const timerPercent = Math.max(0, Math.min(100, (timeLeft / 4.0) * 100));

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 select-none">
      
      {/* Top Bar Perimeter Cluster */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        
        {/* Left: Level selector and GDD button */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 sm:p-2 shadow-lg text-slate-100">
          <div className="flex items-center gap-1.5 pl-1 pr-1.5 border-r border-slate-800">
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] sm:text-xs font-bold whitespace-nowrap">Niv. {currentLevel.id}</span>
          </div>

          <div className="flex items-center gap-1">
            {allLevels.map(lvl => (
              <button
                key={lvl.id}
                onClick={() => onSelectLevel(lvl.id)}
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-xs font-bold transition-all ${
                  currentLevel.id === lvl.id
                    ? 'bg-amber-400 text-slate-950 shadow-sm scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={lvl.name}
              >
                {lvl.id}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

          <button
            onClick={onRestart}
            className="p-1 sm:p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Recommencer le niveau (R)"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={onOpenGDD}
            className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded-lg transition-colors"
            title="Consulter le Game Design Document et le cahier des charges"
          >
            <BookOpen className="w-3 h-3 text-amber-400" />
            <span className="hidden md:inline">GDD</span>
          </button>
        </div>

        {/* Center: The Core 4.00s Timer Gauge & Ammo Revolver Rack */}
        <div className="pointer-events-auto flex items-center gap-3">
          
          {/* Revolver Ammo Rack */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl shadow-lg">
            <div className="flex items-center gap-1">
              {Array.from({ length: maxAmmo }).map((_, idx) => {
                const isLoaded = idx < ammoRemaining;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-6 rounded-t-sm rounded-b-md transition-all ${
                      isLoaded
                        ? 'bg-amber-400 border border-amber-500 shadow-sm shadow-amber-400/30'
                        : 'bg-slate-800 border border-slate-700 opacity-40'
                    }`}
                    title={isLoaded ? 'Balle prête' : 'Balle tirée'}
                  />
                );
              })}
            </div>
            <span className="text-xs font-mono font-bold text-slate-300 pl-1">
              {ammoRemaining}/{maxAmmo}
            </span>
          </div>

          {/* 4.00s Timer Dial */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border shadow-xl transition-all ${
              isTimeCritical
                ? 'bg-rose-950/90 border-rose-500 scale-105 animate-pulse text-rose-300'
                : bulletActive
                ? 'bg-slate-900/90 border-amber-500 text-amber-400'
                : 'bg-slate-900/80 border-slate-800 text-slate-300'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isTimeCritical ? 'text-rose-400 animate-bounce' : 'text-amber-400'}`} />
            
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 leading-none">
                {bulletActive ? 'Vol Balle' : 'Chrono'}
              </span>
              <span className="text-lg sm:text-2xl font-mono font-black tabular-nums tracking-tight">
                {timeLeft.toFixed(2)}s
              </span>
            </div>

            <div className="relative w-6 h-6 sm:w-7 sm:h-7 ml-1">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={isTimeCritical ? 'text-rose-500' : 'text-amber-400'}
                  strokeDasharray={`${timerPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>

        </div>

        {/* Right: Enemies status & audio toggle */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 sm:p-2 shadow-lg text-slate-100">
          <div className="flex items-center gap-1.5 px-2">
            <Skull className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
            <div className="text-xs">
              <span className="text-slate-400 mr-1 hidden sm:inline">Cibles :</span>
              <strong className="text-white font-mono tabular-nums">
                {totalEnemies - enemiesRemaining}/{totalEnemies}
              </strong>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded-lg transition-colors ${
              isMuted ? 'text-rose-400 hover:bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>

      </div>

      {/* Bottom Control Hint line */}
      <div className="pointer-events-none flex justify-center">
        <div className="px-3 sm:px-4 py-1.5 bg-slate-950/80 border border-slate-800/80 rounded-full text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-2 shadow-md">
          <span>Viser : <strong>Souris / Glisser</strong></span>
          <span className="text-slate-600">·</span>
          <span>Tirer : <strong>Clic / Tactile</strong></span>
          <span className="text-slate-600">·</span>
          <span>Durée : <strong>4.0s par balle</strong></span>
          <span className="text-slate-600">·</span>
          <span>Munitions : <strong>Revolver {ammoRemaining}/{maxAmmo}</strong></span>
          <span className="text-slate-600">·</span>
          <span className="text-rose-400 font-medium">⚠️ Évite ton propre ricochet !</span>
        </div>
      </div>

    </div>
  );
};
