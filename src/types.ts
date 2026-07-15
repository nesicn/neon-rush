export type GameState = 'START' | 'PLAYING' | 'GAMEOVER' | 'SHOP' | 'PAUSED';

export interface Upgrades {
  magnetDurationLevel: number;
  shieldOwned: boolean;
}

export interface PlayerProfile {
  totalCoins: number;
  highScore: number;
  unlockedSkins: string[];
  equippedSkin: string;
  upgrades: Upgrades;
}

export interface Mission {
  id: string;
  description: string;
  type: 'COINS_ONE_RUN' | 'DISTANCE_TOTAL' | 'DISTANCE_ONE_RUN';
  target: number;
  progress: number;
  completed: boolean;
  rewardCoins: number;
  claimed: boolean;
}

export interface GameStats {
  state: GameState;
  score: number;
  coins: number;
  speed: number;
  magnetTimer: number;
  boostTimer: number;
  shieldActive: boolean;
  missions: Mission[];
  profile: PlayerProfile;
  notifications: string[];
}

export interface GameEntity {
  id: number;
  type: 'OBSTACLE' | 'COIN' | 'MAGNET' | 'BOOST';
  lane: number;
  x: number;
  z: number;
  color?: string;
  collected?: boolean;
}

export interface PlayerState {
  lane: number;
  x: number;
  z: number;
  targetX: number;
  magnetTimer: number;
  boostTimer: number;
  crashed: boolean;
}

export interface Shockwave {
  x: number;
  z: number;
  radius: number;
  alpha: number;
}

export interface StarParticle {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

export interface RainParticle {
  x: number;
  y: number;
  speed: number;
  length: number;
}

export interface GameNotification {
  text: string;
  timer: number;
}
