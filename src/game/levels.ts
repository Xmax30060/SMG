
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 24 niveaux de puzzle physique.
 * Chaque mécanique est introduite dans un niveau simple,
 * puis approfondie dans un niveau complexe.
 *
 * IMPORTANT :
 * Les nouveaux types d'obstacles doivent être implémentés
 * dans le moteur physique pour produire leurs effets.
 */

import { LevelConfig } from './types';

const E = (
  x: number,
  y: number,
  name: string,
  shirt = '#8B3A3A',
  facing = -1
) => ({
  x,
  y,
  name,
  facing,
  color: {
    skin: '#F5D5C0',
    shirt,
    pants: '#2E3842',
    hat: undefined
  }
});

// Le type flexible permet de déclarer les nouvelles mécaniques
// avant leur ajout définitif à la définition des obstacles.
const O = (data: any): any => data;

const L = (
  id: number,
  name: string,
  subtitle: string,
  description: string,
  ammoCount: number,
  angle: number,
  enemies: any[],
  obstacles: any[]
): LevelConfig => ({
  id,
  name: `Niveau ${id} : ${name}`,
  subtitle,
  description,
  ammoCount,
  playerPos: { x: 100, y: 500 },
  playerAimHintAngle: angle,
  targetTimeScore: 4,
  enemies,
  obstacles
});

const wall = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color = '#4B5563'
) => O({
  id, x, y, width, height,
  type: 'wall',
  color
});

const plank = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  pivotX: number,
  pivotY: number
) => O({
  id, x, y, width, height,
  type: 'plank',
  color: '#9C683B',
  plankConfig: {
    pivotX,
    pivotY,
    angle: 0,
    canRotate: true,
    gravityEnabled: true
  }
});

const crate = (
  id: string,
  x: number,
  y: number,
  width = 42,
  height = 42
) => O({
  id, x, y, width, height,
  type: 'pushable_crate',
  color: '#9C683B',
  mass: 3
});

const spikes = (
  id: string,
  x: number,
  y: number,
  width: number,
  height = 20
) => O({
  id, x, y, width, height,
  type: 'hazard_spikes',
  color: '#DC2626'
});

const plate = (
  id: string,
  x: number,
  y: number,
  linkedTrapId: string
) => O({
  id,
  x, y,
  width: 48,
  height: 14,
  type: 'pressure_plate',
  color: '#D4A325',
  trapConfig: {
    linkedTrapId,
    activated: false,
    requiresWeight: true
  }
});

const trap = (
  id: string,
  x: number,
  y: number,
  width: number,
  delay = 0.5
) => O({
  id, x, y,
  width,
  height: 20,
  type: 'trap_spikes',
  color: '#DC2626',
  trapConfig: {
    activated: false,
    activationDelay: delay
  }
});

const barrel = (id: string, x: number, y: number) => O({
  id, x, y,
  width: 42,
  height: 56,
  type: 'explosive_barrel',
  health: 1,
  maxHealth: 1,
  color: '#993026'
});

const rope = (
  id: string,
  x: number,
  anchorY: number,
  ballY: number,
  length: number,
  mass = 7
) => O({
  id,
  x: x - 15,
  y: anchorY,
  width: 30,
  height: 30,
  type: 'rope_weight',
  ropeConfig: {
    anchorX: x,
    anchorY,
    ballX: x,
    ballY,
    ballOldX: x,
    ballOldY: ballY,
    ballRadius: 26,
    length,
    isCut: false,
    mass
  }
});

const destructible = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  health = 1
) => O({
  id, x, y, width, height,
  type: 'destructible',
  health,
  maxHealth: health,
  color: '#9C683B'
});

const switchObstacle = (id: string, x: number, y: number) => O({
  id, x, y,
  width: 44,
  height: 44,
  type: 'switch',
  isTriggered: false,
  color: '#D4A325'
});

const portal = (
  id: string,
  x: number,
  y: number,
  pairId: string,
  color: string,
  exitDirX = 1,
  exitDirY = 0.2
) => O({
  id, x, y,
  width: 24,
  height: 60,
  type: 'portal',
  color,
  portalConfig: {
    pairId,
    exitDirX,
    exitDirY
  }
});

const door = (
  id: string,
  x: number,
  y: number,
  height: number,
  targetSwitchId: string
) => O({
  id, x, y,
  width: 30,
  height,
  type: 'door',
  targetSwitchId,
  color: '#4B5563',
  doorConfig: {
    isOpen: false,
    openHeight: 0,
    initialHeight: height,
    openSpeed: 280
  }
});

export const LEVELS: LevelConfig[] = [

  // =========================================================
  // PAIRE 1 : APPRENDRE À FAIRE BASCULER UNE PLANCHE
  // =========================================================

  L(
    1,
    'La Planche',
    'Une balle, un pivot, une solution',
    'La planche repose sur un pivot. Frappe son extrémité gauche pour faire basculer son extrémité droite sur le garde.',
    2, -0.3,
    [E(730, 480, 'Garde du Pont')],
    [
      wall('p1-ground-wall', 400, 510, 500, 20),
      plank('p1-plank', 470, 300, 300, 18, 620, 310),
      wall('p1-support', 610, 328, 24, 182),
      wall('p1-cover', 350, 380, 40, 130)
    ]
  ),

  L(
    2,
    'La Planche et le Contrepoids',
    'Choisis le bon point de rupture',
    'Deux gardes se protègent mutuellement. Une caisse alourdit une planche pivotante. Utilise la caisse ou le pivot pour diriger la chute du bon côté.',
    3, -0.25,
    [
      E(680, 480, 'Garde du Pivot'),
      E(850, 480, 'Garde du Couloir', '#4A6B53')
    ],
    [
      plank('p2-plank', 470, 270, 360, 18, 650, 280),
      crate('p2-weight', 720, 220, 42, 42),
      wall('p2-support', 640, 300, 24, 210),
      wall('p2-cover', 390, 360, 36, 150),
      spikes('p2-pit', 470, 510, 380)
    ]
  ),

  // =========================================================
  // PAIRE 2 : PLAQUES DE PRESSION
  // =========================================================

  L(
    3,
    'Le Piège à Pression',
    'Fais tomber une caisse sur la plaque',
    'La plaque jaune déclenche les pointes rouges lorsqu’elle reçoit un poids. Le garde se trouve hors de portée directe.',
    2, -0.2,
    [E(700, 470, 'Garde du Piège')],
    [
      crate('p3-crate', 370, 440, 42, 50),
      plate('p3-plate', 460, 490, 'p3-trap'),
      trap('p3-trap', 540, 490, 240),
      wall('p3-wall', 340, 350, 30, 150)
    ]
  ),

  L(
    4,
    'Le Couloir Piégé',
    'Déclenche deux pièges dans le bon ordre',
    'Deux plaques contrôlent deux zones de pointes. Le poids doit atteindre la première plaque avant de poursuivre vers la seconde.',
    3, -0.3,
    [
      E(600, 470, 'Sentinelle A'),
      E(820, 470, 'Sentinelle B', '#4A6B53')
    ],
    [
      crate('p4-crate', 360, 400, 44, 44),
      plate('p4-plate-a', 450, 490, 'p4-trap-a'),
      trap('p4-trap-a', 510, 490, 130, 0.4),
      wall('p4-barrier', 650, 350, 24, 150),
      plate('p4-plate-b', 690, 490, 'p4-trap-b'),
      trap('p4-trap-b', 730, 490, 150, 0.8)
    ]
  ),

  // =========================================================
  // PAIRE 3 : DOMINOS ET CAISSES
  // =========================================================

  L(
    5,
    'Le Premier Domino',
    'Fais tomber la caisse sur le baril',
    'Une caisse bloque le passage vers un baril explosif. Le bon impact doit déplacer la caisse et atteindre le baril.',
    2, -0.2,
    [E(760, 470, 'Garde du Baril')],
    [
      crate('p5-crate', 410, 450, 50, 60),
      barrel('p5-barrel', 540, 450),
      wall('p5-wall', 640, 330, 30, 180)
    ]
  ),

  L(
    6,
    'La Réaction en Chaîne',
    'Un tir pour trois conséquences',
    'Une caisse en pousse une deuxième, qui libère le baril. Prévois la direction des mouvements pour éliminer les deux gardes avec un seul tir.',
    1, -0.15,
    [
      E(700, 470, 'Garde des Caisses'),
      E(850, 470, 'Commandant', '#1E293B')
    ],
    [
      crate('p6-crate-a', 350, 440, 50, 60),
      crate('p6-crate-b', 440, 400, 50, 100),
      barrel('p6-barrel', 540, 450),
      destructible('p6-support', 610, 410, 30, 100),
      wall('p6-cover', 300, 350, 30, 150)
    ]
  ),

  // =========================================================
  // PAIRE 4 : CORDES ET CONTREPOIDS
  // =========================================================

  L(
    7,
    'Le Boulet Suspendu',
    'Coupe la corde au bon moment',
    'Le boulet est suspendu au-dessus du garde. Coupe sa corde pour déclencher une chute verticale.',
    2, -0.5,
    [E(560, 470, 'Garde du Boulet')],
    [
      rope('p7-rope', 560, 80, 300, 220, 8),
      wall('p7-cover', 380, 350, 30, 160)
    ]
  ),

  L(
    8,
    'Le Pendule Double',
    'Utilise le balancement pour toucher deux cibles',
    'Un pilier bloque le chemin direct. Le boulet doit être libéré pour frapper un support et provoquer une seconde chute.',
    3, -0.45,
    [
      E(640, 470, 'Garde du Pilier'),
      E(840, 470, 'Garde Arrière', '#4A6B53')
    ],
    [
      rope('p8-rope', 520, 60, 290, 230, 10),
      destructible('p8-support', 670, 360, 35, 150),
      plank('p8-plank', 690, 300, 170, 16, 760, 308),
      spikes('p8-pit', 580, 510, 320),
      wall('p8-wall', 400, 330, 30, 180)
    ]
  ),

  // =========================================================
  // PAIRE 5 : PLATEFORMES ET CHUTES
  // =========================================================

  L(
    9,
    'Le Sol Fragile',
    'Détruis le support',
    'Le garde se tient sur une plateforme soutenue par un bloc fragile. Détruis ce bloc pour provoquer sa chute.',
    2, -0.3,
    [E(650, 300, 'Garde Perché')],
    [
      wall('p9-platform', 520, 330, 260, 18, '#9C683B'),
      destructible('p9-support', 630, 350, 40, 150),
      spikes('p9-pit', 500, 510, 300),
      wall('p9-cover', 350, 370, 30, 140)
    ]
  ),

  L(
    10,
    'Le Pont Suspendu',
    'Choisis la bonne section à détruire',
    'Le pont comporte deux supports et une section mobile. Détruire le mauvais support ne suffit pas : vise celui qui fait basculer la section sous le garde.',
    3, -0.35,
    [
      E(760, 400, 'Garde du Pont'),
      E(860, 470, 'Garde de Sortie', '#4A6B53')
    ],
    [
      plank('p10-bridge', 420, 390, 390, 18, 620, 399),
      destructible('p10-support-a', 480, 410, 30, 100),
      destructible('p10-support-b', 720, 410, 30, 100),
      spikes('p10-pit', 420, 510, 470),
      wall('p10-cover', 350, 350, 30, 160)
    ]
  ),

  // =========================================================
  // PAIRE 6 : EXPLOSIONS
  // =========================================================

  L(
    11,
    'Le Baril Caché',
    'Utilise un ricochet pour atteindre le TNT',
    'Un mur protège le baril. Fais rebondir ton projectile sur la surface métallique pour provoquer l’explosion.',
    2, -0.4,
    [E(760, 470, 'Garde du Baril')],
    [
      wall('p11-barrier', 470, 300, 30, 210),
      barrel('p11-barrel', 600, 450),
      wall('p11-deflector', 350, 180, 150, 18, '#5B7A9C')
    ]
  ),

  L(
    12,
    'La Chaîne Explosive',
    'Trois objets, une seule solution',
    'Le premier baril est protégé par une caisse. Déplace-la pour déclencher une explosion qui libère le deuxième baril et atteint les deux gardes.',
    2, -0.25,
    [
      E(730, 470, 'Garde A'),
      E(860, 470, 'Garde B', '#4A6B53')
    ],
    [
      crate('p12-crate', 370, 440, 50, 60),
      barrel('p12-barrel-a', 500, 450),
      barrel('p12-barrel-b', 610, 450),
      destructible('p12-support', 680, 400, 25, 110),
      wall('p12-cover', 320, 350, 30, 160)
    ]
  ),

  // =========================================================
  // PAIRE 7 : RICOCHETS ET DÉFLECTEURS
  // =========================================================

  L(
    13,
    'Le Ricochet Précis',
    'Apprends à utiliser une surface inclinée',
    'Le mur vertical bloque le tir direct. Utilise le déflecteur pour rediriger la balle vers le garde.',
    3, -0.5,
    [E(700, 450, 'Garde du Couloir')],
    [
      wall('p13-wall', 430, 260, 35, 250),
      wall('p13-deflector', 500, 300, 120, 18, '#5B7A9C'),
      wall('p13-cover', 600, 350, 30, 160)
    ]
  ),

  L(
    14,
    'Le Labyrinthe de Métal',
    'Calcule deux rebonds successifs',
    'Deux plaques métalliques forment un parcours indirect. Trouve l’angle qui permet à la balle de contourner le blindage sans gaspiller de munition.',
    3, -0.65,
    [
      E(800, 430, 'Garde du Labyrinthe'),
      E(850, 250, 'Guetteur', '#4A6B53')
    ],
    [
      wall('p14-wall-a', 360, 250, 30, 260),
      wall('p14-deflector-a', 420, 310, 130, 18, '#5B7A9C'),
      wall('p14-wall-b', 590, 220, 30, 290),
      wall('p14-deflector-b', 650, 350, 120, 18, '#5B7A9C'),
      wall('p14-platform', 740, 280, 130, 18)
    ]
  ),

  // =========================================================
  // PAIRE 8 : PORTAILS
  // =========================================================

  L(
    15,
    'Le Portail de Secours',
    'Contourne le mur par téléportation',
    'Le portail bleu reçoit le projectile et le portail orange le renvoie vers le garde. Ajuste l’angle d’entrée.',
    3, -0.8,
    [E(820, 430, 'Garde du Sas')],
    [
      wall('p15-vault', 620, 160, 30, 350),
      portal('p15-in', 280, 90, 'p15-out', '#3B82F6'),
      portal('p15-out', 680, 260, 'p15-in', '#F97316'),
      wall('p15-cover', 740, 300, 30, 210)
    ]
  ),

  L(
    16,
    'Le Portail Piégé',
    'Choisis le bon portail et la bonne sortie',
    'Deux accès sont possibles, mais un seul permet de contourner le blindage et d’atteindre le support du piège.',
    3, -0.7,
    [
      E(820, 450, 'Garde du Coffre'),
      E(850, 250, 'Guetteur', '#4A6B53')
    ],
    [
      wall('p16-vault', 600, 120, 30, 390),
      portal('p16-in-a', 250, 80, 'p16-out-a', '#3B82F6'),
      portal('p16-out-a', 650, 220, 'p16-in-a', '#F97316'),
      portal('p16-in-b', 400, 160, 'p16-out-b', '#3B82F6'),
      portal('p16-out-b', 700, 360, 'p16-in-b', '#F97316'),
      destructible('p16-support', 760, 400, 30, 110)
    ]
  ),

  // =========================================================
  // PAIRE 9 : INTERRUPTEURS ET PORTES
  // =========================================================

  L(
    17,
    'Le Bouton Caché',
    'Active l’interrupteur pour ouvrir la porte',
    'Le garde est derrière une porte blindée. Le bouton se trouve en hauteur : utilise un tir indirect pour l’activer.',
    3, -0.5,
    [E(820, 470, 'Garde du Sas')],
    [
      switchObstacle('p17-switch', 460, 70),
      door('p17-door', 650, 210, 300, 'p17-switch'),
      wall('p17-cover', 350, 300, 30, 210)
    ]
  ),

  L(
    18,
    'Les Deux Verrous',
    'Déverrouille les portes dans le bon ordre',
    'Deux interrupteurs contrôlent deux portes. Le premier tir doit ouvrir le passage vers le second interrupteur avant que tu puisses atteindre le garde.',
    4, -0.5,
    [
      E(820, 470, 'Commandant'),
      E(620, 470, 'Sentinelle', '#4A6B53')
    ],
    [
      switchObstacle('p18-switch-a', 400, 80),
      door('p18-door-a', 500, 210, 300, 'p18-switch-a'),
      switchObstacle('p18-switch-b', 650, 80),
      door('p18-door-b', 740, 210, 300, 'p18-switch-b'),
      wall('p18-cover', 350, 330, 30, 180)
    ]
  ),

  // =========================================================
  // PAIRE 10 : DÉLAIS ET TEMPORISATION
  // =========================================================

  L(
    19,
    'Le Piège Retardé',
    'Déclenche le piège avant l’arrivée du garde',
    'La plaque déclenche les pointes après un court délai. Comprends la séquence avant de lancer le projectile.',
    2, -0.2,
    [E(700, 470, 'Garde Pressé')],
    [
      crate('p19-weight', 400, 440, 42, 42),
      plate('p19-plate', 480, 490, 'p19-trap'),
      trap('p19-trap', 540, 490, 250, 1.5),
      wall('p19-cover', 340, 350, 30, 160)
    ]
  ),

  L(
    20,
    'Le Double Chronomètre',
    'Coordonne deux pièges temporisés',
    'Le premier piège bloque la route du garde. Le second doit être activé pendant que le premier est encore dangereux.',
    3, -0.25,
    [
      E(600, 470, 'Garde A'),
      E(820, 470, 'Garde B', '#4A6B53')
    ],
    [
      crate('p20-weight-a', 360, 420, 42, 42),
      plate('p20-plate-a', 440, 490, 'p20-trap-a'),
      trap('p20-trap-a', 480, 490, 130, 1.2),
      crate('p20-weight-b', 630, 420, 42, 42),
      plate('p20-plate-b', 690, 490, 'p20-trap-b'),
      trap('p20-trap-b', 730, 490, 150, 0.5)
    ]
  ),

  // =========================================================
  // PAIRE 11 : MÉCANISMES COMBINÉS
  // =========================================================

  L(
    21,
    'Le Contrepoids',
    'Libère le poids pour ouvrir le passage',
    'Un contrepoids maintient une plateforme en position. Détruis son support pour modifier le passage vers le garde.',
    3, -0.45,
    [E(800, 430, 'Garde de la Plateforme')],
    [
      rope('p21-weight', 500, 70, 270, 200, 9),
      destructible('p21-support', 540, 350, 40, 160),
      plank('p21-platform', 600, 330, 240, 18, 720, 339),
      spikes('p21-pit', 540, 510, 350)
    ]
  ),

  L(
    22,
    'Le Mécanisme Croisé',
    'Combine poids, plaque et porte',
    'Le contrepoids doit d’abord libérer la caisse. La caisse active ensuite la plaque qui ouvre la porte finale.',
    4, -0.5,
    [E(830, 470, 'Commandant Final')],
    [
      rope('p22-weight', 400, 60, 250, 190, 10),
      destructible('p22-support', 430, 340, 35, 170),
      crate('p22-crate', 490, 440, 42, 42),
      plate('p22-plate', 570, 490, 'p22-trap'),
      trap('p22-trap', 620, 490, 100, 0.6),
      switchObstacle('p22-switch', 680, 80),
      door('p22-door', 750, 210, 300, 'p22-switch')
    ]
  ),

  // =========================================================
  // PAIRE 12 : ÉNIGMES FINALES
  // =========================================================

  L(
    23,
    'Le Plan Parfait',
    'Une séquence logique en trois étapes',
    'Le garde est protégé par une porte. Il faut libérer le contrepoids, activer l’interrupteur puis provoquer la chute de la plateforme. Chaque tir compte.',
    4, -0.55,
    [
      E(820, 450, 'Commandant'),
      E(650, 300, 'Garde Supérieur', '#4A6B53')
    ],
    [
      rope('p23-weight', 420, 60, 260, 200, 10),
      destructible('p23-support', 470, 350, 35, 160),
      switchObstacle('p23-switch', 560, 70),
      door('p23-door', 700, 200, 310, 'p23-switch'),
      plank('p23-plank', 610, 300, 180, 18, 700, 309),
      spikes('p23-pit', 570, 510, 330)
    ]
  ),

  L(
    24,
    'La Citadelle des Énigmes',
    'Le défi final : comprendre avant de tirer',
    'Un dernier défi combinant caisses, pendule, interrupteur, portail et TNT. Observe les mécanismes et construis mentalement la chaîne de réactions. Chaque munition est précieuse.',
    5, -0.6,
    [
      E(480, 470, 'Garde Avancé'),
      E(720, 240, 'Guetteur'),
      E(860, 470, 'Commandant Suprême', '#1E293B')
    ],
    [
      rope('p24-weight', 480, 60, 260, 200, 10),
      crate('p24-crate-a', 340, 440, 45, 55),
      crate('p24-crate-b', 400, 390, 45, 105),
      barrel('p24-barrel', 550, 450),
      portal('p24-portal-in', 250, 160, 'p24-portal-out', '#3B82F6'),
      portal('p24-portal-out', 620, 100, 'p24-portal-in', '#F97316'),
      switchObstacle('p24-switch', 780, 60),
      door('p24-door', 760, 210, 300, 'p24-switch'),
      plank('p24-plank', 600, 300, 180, 18, 690, 309),
      spikes('p24-pit', 450, 510, 450)
    ]
  )
];
