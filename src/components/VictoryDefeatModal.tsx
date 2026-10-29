/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trophy, Skull, RotateCcw, ArrowRight, BookOpen, Star } from 'lucide-react';

interface VictoryDefeatModalProps {
  type: 'VICTORY' | 'GAME_OVER' | null;
  reason?: string;
  stats?: { timeUsed: number; bounces: number; bulletsUsed?: number };
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onRestart: () => void;
  onOpenGDD: () => void;
}

export const VictoryDefeatModal: React.FC<VictoryDefeatModalProps> = ({
  type,
  reason,
  stats,
  hasNextLevel,
  onNextLevel,
  onRestart,
  onOpenGDD
}) => {
  if (!type) return null;

  const isVictory = type === 'VICTORY';

  // Stars calculation based on bullets used (1 bullet = 3 stars, 2 = 2 stars, 3+ = 1 star)
  const stars = stats ? (stats.bulletsUsed === 1 ? 3 : (stats.bulletsUsed ?? 2) <= 2 ? 2 : 1) : 1;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-center text-slate-100 space-y-6">
        
        {/* Top Badge & Icon */}
        <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg">
          {isVictory ? (
            <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Skull className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h2 className={`text-2xl font-black tracking-tight ${isVictory ? 'text-amber-400' : 'text-rose-400'}`}>
            {isVictory ? 'MISSION ACCOMPLIE !' : 'ÉCHEC DU TIR'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
            {isVictory
              ? 'Tous les ennemis ragdoll ont été pulvérisés !'
              : reason || 'La balle a échoué à éliminer les cibles.'}
          </p>
        </div>

        {/* Victory Stats breakdown */}
        {isVictory && stats && (
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {/* Star rating */}
            <div className="flex justify-center gap-1.5 text-amber-400">
              {[1, 2, 3].map(st => (
                <Star
                  key={st}
                  className={`w-6 h-6 ${st <= stars ? 'fill-current text-amber-400' : 'text-slate-700'}`}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800">
              <div>
                <span className="text-slate-400 block">Balles tirées :</span>
                <strong className="text-white font-mono text-sm tabular-nums">
                  {stats.bulletsUsed ?? 1} {stats.bulletsUsed === 1 ? '(Parfait !)' : ''}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Rebonds totaux :</span>
                <strong className="text-white font-mono text-sm tabular-nums">
                  {stats.bounces}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {isVictory && hasNextLevel ? (
            <button
              onClick={onNextLevel}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <span>Niveau Suivant</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onRestart}
              className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 font-bold rounded-xl transition-all shadow-md cursor-pointer ${
                isVictory
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  : 'bg-rose-500 hover:bg-rose-400 text-white'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isVictory ? 'Rejouer ce niveau' : 'Réessayer'}</span>
            </button>
          )}

          <button
            onClick={onOpenGDD}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Lire GDD</span>
          </button>
        </div>

      </div>
    </div>
  );
};
