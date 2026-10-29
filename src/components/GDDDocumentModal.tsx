/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, BookOpen, Copy, Check, Terminal, Layers, ShieldAlert, Cpu } from 'lucide-react';

interface GDDDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GDDDocumentModal: React.FC<GDDDocumentModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'ragdoll' | 'levels' | 'tech' | 'code'>('all');

  if (!isOpen) return null;

  const handleCopy = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const PSEUDO_CODE_TIMER = `// ===============================================================
// 1. CYCLE DE VIE & GESTION DU TIMER DE LA BALLE (4.0 SECONDES)
// ===============================================================

class BulletManager:
    const MAX_LIFETIME = 4.0 // Durée de vie stricte en secondes
    var activeBullet: Bullet = null
    var bulletTimer: float = 0.0

    function shootBullet(origin: Vector2, targetDirection: Vector2, initialSpeed: float = 900.0):
        if activeBullet != null and activeBullet.isActive:
            return // Règle stricte: une seule balle active à la fois
        
        activeBullet = new Bullet(origin, targetDirection.normalized() * initialSpeed)
        activeBullet.isActive = true
        bulletTimer = MAX_LIFETIME
        AudioSystem.play("gunshot_blast")
        UI.startTimerGauge(MAX_LIFETIME)

    function update(dt: float):
        if activeBullet == null or not activeBullet.isActive:
            return
            
        // Décrémentation du compte à rebours
        bulletTimer -= dt
        UI.updateTimerDisplay(clamp(bulletTimer, 0.0, MAX_LIFETIME))

        // Alerte sonore dans les dernières fractions de seconde
        if bulletTimer <= 1.5 and bulletTimer > 0.0:
            AudioSystem.playPulseBeep(frequency = 880Hz, interval = 0.25s)

        // Condition d'échec par épuisement du temps
        if bulletTimer <= 0.0:
            activeBullet.isActive = false
            activeBullet.destroyWithFade()
            
            if LevelManager.countAliveEnemies() > 0:
                GameManager.triggerDefeat(
                    reason = "TEMPS ÉCOULÉ : La balle s'est arrêtée après 4 secondes sans éliminer tous les ennemis."
                )
            else:
                GameManager.triggerVictory()`;

  const PSEUDO_CODE_COLLISIONS = `// ===============================================================
// 2. GESTION DES COLLISIONS & PHYSIQUE DES MATÉRIAUX
// ===============================================================

function onBulletCollision(bullet: Bullet, hitObject: CollisionObject, hitPoint: Vector2, hitNormal: Vector2):
    
    // --- CAS A : COLLISION AVEC LE JOUEUR (CONDITIONS DE DÉFAITE IMMÉDIATE) ---
    if hitObject.type == "PLAYER":
        // Si le tir est en vol depuis plus de 0.1s (évite l'auto-collision à la sortie du canon)
        if (MAX_LIFETIME - bulletTimer) > 0.1:
            AudioSystem.play("ragdoll_flesh_impact")
            bullet.isActive = false
            
            // Déclenche l'effondrement Ragdoll du joueur
            RagdollSystem.killAndImpulse(
                target = hitObject.ragdollRef, 
                impactPoint = hitPoint, 
                impulseVector = bullet.velocity * 1.5
            )
            
            Camera.shake(intensity = 15, duration = 0.4s)
            GameManager.triggerDefeat(reason = "MORT PAR RICOCHET : Vous avez été abattu par votre propre balle !")
            return

    // --- CAS B : COLLISION AVEC UN ENNEMI (RAGDOLL) ---
    else if hitObject.type == "ENEMY":
        var enemy = hitObject.ragdollRef
        if enemy.isAlive:
            enemy.isAlive = false
            AudioSystem.play("ragdoll_flesh_thud")
            VFX.spawnHitStarsAndSparks(hitPoint)
            
            // Transfert d'impulsion cinétique vers le ragdoll
            RagdollSystem.applyImpulseToJoint(
                ragdoll = enemy,
                jointIndex = hitObject.jointIndex,
                impulse = bullet.velocity * 1.2
            )
            
            // Test de dislocation si force supérieure au seuil
            if bullet.velocity.length() > DISLOCATION_THRESHOLD:
                RagdollSystem.severLimb(enemy, hitObject.limbId)

            LevelManager.notifyEnemyEliminated(enemy)
            
            // Hitstop pour renforcer l'impact (game feel)
            Time.pauseEngine(duration = 0.045s)
            Camera.shake(intensity = 8, duration = 0.2s)
            
            // La balle transperce avec perte d'énergie partielle
            bullet.velocity *= 0.85

            if LevelManager.countAliveEnemies() == 0:
                GameManager.triggerVictory()

    // --- CAS C : COLLISION AVEC DÉCOR ET OBSTACLES INTERACTIFS ---
    else if hitObject.type == "WALL":
        // Rebond élastique parfait selon la loi de réflexion
        // V' = V - 2 * (V . N) * N
        bullet.velocity = bullet.velocity - 2.0 * dot(bullet.velocity, hitNormal) * hitNormal
        bullet.bounces += 1
        
        AudioSystem.playRicochetPing(pitchLevel = bullet.bounces)
        VFX.spawnSparks(hitPoint, reflectionNormal = hitNormal)

    else if hitObject.type == "DESTRUCTIBLE_CRATE":
        hitObject.health -= 1
        VFX.spawnWoodDebris(hitPoint, count = 8)
        AudioSystem.play("wood_crack")
        
        if hitObject.health <= 0:
            hitObject.destroy()
            PhysicsWorld.spawnDynamicDebrisChunks(hitObject.bounds, impulseFrom = bullet.velocity)
        
        bullet.velocity = bullet.velocity.reflect(hitNormal) * 0.95

    else if hitObject.type == "EXPLOSIVE_BARREL":
        hitObject.explode()
        AudioSystem.play("explosion_boom")
        Camera.shake(intensity = 18, duration = 0.5s)
        
        // Onde de choc radiale projetant tous les corps rigides et ragdolls à proximité
        var affectedBodies = PhysicsWorld.queryRadius(hitPoint, radius = 180.0)
        for body in affectedBodies:
            var dir = (body.position - hitPoint).normalized()
            var force = (1.0 - (body.position.distanceTo(hitPoint) / 180.0)) * 2500.0
            RagdollSystem.applyImpulse(body, dir * force)
            
        bullet.isActive = false`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight">
                Game Design Document & Cahier des Charges Technique
              </h2>
              <p className="text-xs text-slate-400">
                Ricochet Ragdoll : Puzzle Physique 2D (Chrono 4s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-xs overflow-x-auto">
          {[
            { id: 'all', label: 'Tout le document', icon: BookOpen },
            { id: 'ragdoll', label: '1. Physique & Ragdoll', icon: Layers },
            { id: 'levels', label: '2. Level Design (3 Niveaux)', icon: ShieldAlert },
            { id: 'tech', label: '3. Moteurs Recommandés', icon: Cpu },
            { id: 'code', label: '4. Pseudo-Code Moteur', icon: Terminal },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 text-sm leading-relaxed text-slate-300">
          
          {/* Section: Overview */}
          {(activeTab === 'all') && (
            <section className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/60">
              <h3 className="text-base font-bold text-white mb-2">0. Fiche d'Identité & Vision Créative</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-400">Titre de travail :</span> <strong className="text-white">Ricochet Ragdoll : 4 Seconds to Die</strong></div>
                <div><span className="text-slate-400">Genre :</span> <strong className="text-white">Puzzle / Action Physique 2D</strong></div>
                <div><span className="text-slate-400">Cible :</span> <strong className="text-white">Web HTML5 (desktop & mobile) / Casual tactile</strong></div>
                <div><span className="text-slate-400">Direction Artistique :</span> <strong className="text-white">Cartoon satirique, slapstick, animations ragdoll élastiques</strong></div>
                <div className="col-span-2 text-slate-300 pt-2 border-t border-slate-700/60">
                  <span className="text-slate-400">Pitch :</span> Le joueur tire une unique munition balistique super-élastique dotée d'une durée de vie de exactement <strong>4,00 secondes</strong>. La balle doit ricocher pour contourner des protections et exterminer tous les ennemis ragdoll sans jamais toucher le tireur.
                </div>
              </div>
            </section>
          )}

          {/* Section 1: Ragdoll Physics */}
          {(activeTab === 'all' || activeTab === 'ragdoll') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> 1. Système de Physique & Modélisation Ragdoll
                </h3>
                <button
                  onClick={() => handleCopy(`Système de Physique & Ragdoll...`, 'ragdoll')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                >
                  {copiedSection === 'ragdoll' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copier</span>
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                <p>
                  Les personnages ne sont pas de simples sprites animés, mais des <strong>chaînes articulées de corps rigides</strong> connectées par des contraintes de distance et de pivot (Verlet Integration ou Revolute Joints de Box2D) :
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                    <strong className="text-white block mb-1 text-xs">A. Anatomie & Squelette</strong>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      <li><strong>Tête</strong> (Sphère, masse 1.0kg)</li>
                      <li><strong>Torse</strong> (Boîte/Capsule, masse 1.8kg)</li>
                      <li><strong>2 Bras & Mains</strong> (masses 0.6kg)</li>
                      <li><strong>2 Jambes & Pieds</strong> (masses 0.9kg)</li>
                      <li>Ressort d'équilibre postural au repos.</li>
                    </ul>
                  </div>

                  <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                    <strong className="text-white block mb-1 text-xs">B. Transfert d'Impulsion & Projection</strong>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      <li>Au contact, l'impulsion $J = m \cdot \Delta v$ est transmise au membre ciblé.</li>
                      <li>L'état postural se désactive instantanément (passage en mode mou).</li>
                      <li>Vecteur de vélocité projetant le corps dans la direction de la balle.</li>
                    </ul>
                  </div>

                  <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                    <strong className="text-white block mb-1 text-xs">C. Dislocation & Cartoon Slapstick</strong>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      <li>Si l'impulsion dépasse le seuil critique (F &gt; 1800 N), la contrainte se rompt.</li>
                      <li>Membres éjectés avec rotation rapide.</li>
                      <li>Yeux qui se transforment en croix (X_X) ou sortent des orbites.</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                  <strong className="text-slate-200">Comportement du Joueur :</strong> Le joueur possède la même structure ragdoll. S'il commet l'erreur de tirer selon un angle qui fait revenir la balle vers sa position, l'impact le fauche immédiatement en ragdoll comique, déclenchant la défaite "Mort par ricochet".
                </div>
              </div>
            </section>
          )}

          {/* Section 2: Level Design */}
          {(activeTab === 'all' || activeTab === 'levels') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> 2. Level Design : Progression & 7 Niveaux de Cas d'Usage
                </h3>
              </div>

              <div className="space-y-3">
                {/* Level 1 */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-sm">Niveau 1 : Angles Morts & Premier Rebond</strong>
                    <span className="text-xs text-sky-400 font-mono">Tutoriel · 3 Balles</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    <strong>Mécanique :</strong> Tir indirect imposé par un mur de béton impénétrable. Viser le réflecteur au plafond fait plonger la balle par ricochet vers le garde retranché.
                  </p>
                </div>

                {/* Level 2 */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-sm">Niveau 2 : Le Pendule & La Corde</strong>
                    <span className="text-xs text-amber-400 font-mono">Physique de Poids · 3 Balles</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    <strong>Mécanique :</strong> Un lourd boulet d'acier est suspendu par une corde au-dessus de la tranchée ennemie. Tirer sur la corde la tranche net, libérant le boulet qui écrase les gardes au sol.
                  </p>
                </div>

                {/* Level 3 */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-sm">Niveau 3 : Murs Destructibles & Barils Explosifs</strong>
                    <span className="text-xs text-rose-400 font-mono">Destruction · 3 Balles</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    <strong>Mécanique :</strong> Caisses de briques destructibles et baril de TNT. La détonation crée une onde de choc radiale propulsant les ennemis et projetant des débris physiques mortels.
                  </p>
                </div>

                {/* Level 4 */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-sm">Niveau 4 : Portails Spatiaux & Sas Téléporteur</strong>
                    <span className="text-xs text-cyan-400 font-mono">Warp Spatio-Temporel · 3 Balles</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    <strong>Mécanique :</strong> Un bunker hermétique protège le général. La balle entrée dans le portail bleu jaillit instantanément du portail orange à pleine vélocité derrière les lignes ennemies.
                  </p>
                </div>

                {/* Level 5 */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-sm">Niveau 5 : Vitres Brisées & Interrupteur</strong>
                    <span className="text-xs text-emerald-400 font-mono">Mécanismes · 3 Balles</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    <strong>Mécanique :</strong> Une vitre transparente se pulvérise en éclats au contact de la balle, lui permettant d'atteindre l'interrupteur qui lève la porte blindée protégeant les gardes.
                  </p>
                </div>

                {/* Level 6 */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-sm">Niveau 6 : Trampolines Caoutchouc & Pointes Mortelles</strong>
                    <span className="text-xs text-purple-400 font-mono">Super Elasticité · 4 Balles</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    <strong>Mécanique :</strong> Pare-chocs en caoutchouc amplifiant la vélocité avec un "BOING!" sonore, combinés à une fosse de pointes d'acier acérées éliminant tout ragdoll qui y chute.
                  </p>
                </div>

                {/* Level 7 */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-sm">Niveau 7 : La Citadelle Imprenable (Boss Final)</strong>
                    <span className="text-xs text-red-400 font-mono">Complexe · 4 Balles</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    <strong>Mécanique :</strong> Puzzle complet combinant portail spatial, pendule destructeur à trancher, interrupteur d'ouverture et baril explosif pour éliminer l'état-major ennemi.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Section 3: Tech Engine comparison */}
          {(activeTab === 'all' || activeTab === 'tech') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> 3. Cahier des Charges & Recommandations Techniques
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <strong className="text-white text-sm block">A. Recommandation Moteurs de Jeu</strong>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <strong className="text-amber-400 block mb-1">1. Phaser 3 / PixiJS (Web / HTML5)</strong>
                      <p className="text-slate-400 mb-2">Idéal pour le navigateur mobile/desktop instantané sans téléchargement lourd.</p>
                      <span className="text-emerald-400 font-medium">Recommandé pour ce prototype web rapide.</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <strong className="text-sky-400 block mb-1">2. Godot 4.x (2D Natif & Web export)</strong>
                      <p className="text-slate-400 mb-2">Moteur open-source léger, physique 2D intégrée exceptionnelle, support d'assemblage de ragdoll via `PinJoint2D`.</p>
                      <span className="text-sky-300 font-medium">Recommandé pour production multiplateforme.</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <strong className="text-purple-400 block mb-1">3. Unity 2D (C#)</strong>
                      <p className="text-slate-400 mb-2">Composants `HingeJoint2D` et pipeline d'effets visuels / audio professionnels.</p>
                      <span className="text-purple-300 font-medium">Recommandé si publication Steam / App Stores.</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <strong className="text-white text-sm block">B. Recommandation Moteurs de Physique 2D</strong>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <strong className="text-emerald-400 block mb-1">Box2D (ou planck.js / box2d-wasm)</strong>
                      <p className="text-slate-400">
                        La référence absolue en 2D pour les jeux de physique à la Angry Birds ou Happy Wheels. Détection d'impact continue (CCD - Continuous Collision Detection) indispensable pour éviter l'effet tunnel quand la balle voyage à 900 px/s.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <strong className="text-cyan-400 block mb-1">Matter.js / Verlet Pure Canvas</strong>
                      <p className="text-slate-400">
                        Extrêmement simple à intégrer dans un bundle JS sans WebAssembly lourd. Permet de concevoir des contraintes élastiques souples et de rompre des ressorts par code direct.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 4: Pseudo-code */}
          {(activeTab === 'all' || activeTab === 'code') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> 4. Script de Logique Principale (Pseudo-Code / Architecture)
                </h3>
              </div>

              <div className="space-y-4">
                {/* Timer Code */}
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                    <span className="text-xs font-mono text-slate-300 font-bold">A. Gestion du Timer 4s & Décompte</span>
                    <button
                      onClick={() => handleCopy(PSEUDO_CODE_TIMER, 'timer')}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                    >
                      {copiedSection === 'timer' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copier code</span>
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                    {PSEUDO_CODE_TIMER}
                  </pre>
                </div>

                {/* Collisions Code */}
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                    <span className="text-xs font-mono text-slate-300 font-bold">B. Traitement des Collisions (Ennemi, Joueur, Murs, Barils)</span>
                    <button
                      onClick={() => handleCopy(PSEUDO_CODE_COLLISIONS, 'collisions')}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                    >
                      {copiedSection === 'collisions' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copier code</span>
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
                    {PSEUDO_CODE_COLLISIONS}
                  </pre>
                </div>
              </div>
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 text-xs">
          <div className="text-slate-400">
            Document conforme aux règles de game design 2D physique & ragdolls.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-400 text-slate-950 font-bold rounded-lg hover:bg-amber-300 transition-colors shadow-sm"
          >
            Fermer et Jouer au Prototype
          </button>
        </div>

      </div>
    </div>
  );
};
