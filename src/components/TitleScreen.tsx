/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Play, BookOpen, Volume2, VolumeX, ShieldAlert, Zap } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenGDD: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenGDD,
  isMuted,
  onToggleMute
}) => {
  // Listen for Enter or Space to quickly start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="relative w-full aspect-video max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between p-8 sm:p-12 select-none">
      
      {/* Background Decor & Trajectory Art */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#475569" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Stylized ricochet trajectory */}
          <path
            d="M 100 450 L 320 80 L 580 460 L 850 140"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="3"
            strokeDasharray="8 8"
          />
          <circle cx="320" cy="80" r="8" fill="#EF4444" />
          <circle cx="580" cy="460" r="8" fill="#EF4444" />
          <circle cx="850" cy="140" r="12" fill="#EAB308" />
        </svg>
      </div>

      {/* Top Bar inside title */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg shadow-md">
          <Zap className="w-3.5 h-3.5" />
          <span>Édition BD Cartoon · 7 Niveaux & Portails</span>
        </div>

        <button
          onClick={onToggleMute}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
          title={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-200" />}
        </button>
      </div>

      {/* Center Hero Lockup with bespoke inline SVG Title */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto space-y-5">
        
        {/* Bespoke inline SVG Title Lockup */}
        <div className="max-w-lg w-full">
          <svg viewBox="0 0 600 130" className="w-full drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text
              x="50%"
              y="55"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="#F8FAFC"
              stroke="#0F172A"
              strokeWidth="5"
              paintOrder="stroke fill"
              fontFamily="Impact, sans-serif"
              fontWeight="900"
              fontSize="52"
              letterSpacing="0.02em"
            >
              RICOCHET
            </text>
            <text
              x="50%"
              y="105"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="#FBBF24"
              stroke="#0F172A"
              strokeWidth="4"
              paintOrder="stroke fill"
              fontFamily="Impact, sans-serif"
              fontWeight="800"
              fontSize="34"
              letterSpacing="0.08em"
            >
              RAGDOLL : 4 SECONDES
            </text>
          </svg>
        </div>

        <p className="text-slate-300 text-xs sm:text-sm max-w-md leading-relaxed">
          Revolver chargé. Balle active pendant <strong className="text-amber-400 font-mono">4.00s</strong>. Portails de téléportation, boulet destructeur à trancher, trampolines et cibles mobiles !
        </p>

        {/* Feature badges row */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md">🔫 Revolver & Munitions</span>
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md">🌀 Portails Spatiaux</span>
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md">🪓 Corde & Boulet</span>
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md">💥 Onomatopées BD</span>
        </div>

        {/* Primary CTA & Secondary GDD Action */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <button
            onClick={onStartGame}
            className="flex items-center gap-2.5 px-8 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base rounded-xl transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-amber-400/20 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Jouer Maintenant</span>
          </button>

          <button
            onClick={onOpenGDD}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl transition-colors border border-slate-700 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>GDD & Tech Spec</span>
          </button>
        </div>

      </div>

      {/* Bottom Flat Control Hint Line */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-4 gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Règle d'or : La balle ricochant vers toi cause la défaite immédiate.</span>
        </div>
        <div className="font-mono text-slate-400">
          Souris pour Viser · Clic pour Tirer · [Espace] ou [Entrée] pour Jouer
        </div>
      </div>

    </div>
  );
};
