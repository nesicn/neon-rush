import { PlayerProfile } from '../types';

const STORAGE_KEY = 'neon_player_profile';

const DEFAULT_PROFILE: PlayerProfile = {
  totalCoins: 0,
  highScore: 0,
  unlockedSkins: ['default'],
  equippedSkin: 'default',
  upgrades: {
    magnetDurationLevel: 1,
    shieldOwned: false
  }
};

export class ProfileManager {
  private profile: PlayerProfile;

  constructor() {
    this.profile = this.loadProfile();
  }

  private loadProfile(): PlayerProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
      
      const parsed = JSON.parse(data);
      if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid profile');
      
      return {
        totalCoins: typeof parsed.totalCoins === 'number' && !isNaN(parsed.totalCoins) ? parsed.totalCoins : 0,
        highScore: typeof parsed.highScore === 'number' && !isNaN(parsed.highScore) ? parsed.highScore : 0,
        unlockedSkins: Array.isArray(parsed.unlockedSkins) ? Array.from(new Set(['default', ...parsed.unlockedSkins.filter((s: any) => typeof s === 'string')])) : ['default'],
        equippedSkin: typeof parsed.equippedSkin === 'string' ? parsed.equippedSkin : 'default',
        upgrades: {
          magnetDurationLevel: typeof parsed?.upgrades?.magnetDurationLevel === 'number' ? Math.max(1, Math.min(5, parsed.upgrades.magnetDurationLevel)) : 1,
          shieldOwned: typeof parsed?.upgrades?.shieldOwned === 'boolean' ? parsed.upgrades.shieldOwned : false,
        }
      };
    } catch (e) {
      console.warn('Profile corrupted, resetting to default', e);
      return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    }
  }

  saveProfile() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (e) {
      console.error('Failed to save profile to local storage', e);
    }
  }

  getProfile(): PlayerProfile {
    return this.profile;
  }

  addCoins(amount: number) {
    this.profile.totalCoins += amount;
    this.saveProfile();
  }

  setHighScore(score: number) {
    if (score > this.profile.highScore) {
      this.profile.highScore = Math.floor(score);
      this.saveProfile();
    }
  }

  buySkin(skinId: string, cost: number): boolean {
    if (this.profile.totalCoins >= cost && !this.profile.unlockedSkins.includes(skinId)) {
      this.profile.totalCoins -= cost;
      this.profile.unlockedSkins.push(skinId);
      this.saveProfile();
      return true;
    }
    return false;
  }

  equipSkin(skinId: string) {
    if (this.profile.unlockedSkins.includes(skinId)) {
      this.profile.equippedSkin = skinId;
      this.saveProfile();
    }
  }

  buyMagnetUpgrade(cost: number): boolean {
    if (this.profile.totalCoins >= cost && this.profile.upgrades.magnetDurationLevel < 5) {
      this.profile.totalCoins -= cost;
      this.profile.upgrades.magnetDurationLevel += 1;
      this.saveProfile();
      return true;
    }
    return false;
  }

  buyShield(cost: number): boolean {
    if (this.profile.totalCoins >= cost && !this.profile.upgrades.shieldOwned) {
      this.profile.totalCoins -= cost;
      this.profile.upgrades.shieldOwned = true;
      this.saveProfile();
      return true;
    }
    return false;
  }
  
  useShield() {
    this.profile.upgrades.shieldOwned = false;
    this.saveProfile();
  }
}
