import { Mission } from '../types';

const DAILY_MISSIONS: Mission[] = [
  { id: 'm1', description: 'Collect 50 coins in one run', type: 'COINS_ONE_RUN', target: 50, progress: 0, completed: false, rewardCoins: 100, claimed: false },
  { id: 'm2', description: 'Drive 5,000 meters in one run', type: 'DISTANCE_ONE_RUN', target: 5000, progress: 0, completed: false, rewardCoins: 150, claimed: false },
  { id: 'm3', description: 'Drive 10,000 meters total', type: 'DISTANCE_TOTAL', target: 10000, progress: 0, completed: false, rewardCoins: 300, claimed: false },
];

export class MissionManager {
  missions: Mission[] = [];

  constructor() {
    this.loadMissions();
  }

  loadMissions() {
    const stored = localStorage.getItem('neon_missions');
    const storedDate = localStorage.getItem('neon_missions_date');
    const today = new Date().toDateString();

    if (stored && storedDate === today) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Merge safely with DAILY_MISSIONS structure
          this.missions = JSON.parse(JSON.stringify(DAILY_MISSIONS)).map((defaultMission: Mission) => {
            const storedMission = parsed.find((m: any) => m && typeof m === 'object' && m.id === defaultMission.id);
            if (storedMission) {
              return {
                ...defaultMission,
                progress: typeof storedMission.progress === 'number' && !isNaN(storedMission.progress) ? storedMission.progress : 0,
                completed: typeof storedMission.completed === 'boolean' ? storedMission.completed : false,
                claimed: typeof storedMission.claimed === 'boolean' ? storedMission.claimed : false
              };
            }
            return defaultMission;
          });
        } else {
          throw new Error('Invalid missions structure');
        }
      } catch (e) {
        console.warn('Missions corrupted, resetting to defaults', e);
        this.missions = JSON.parse(JSON.stringify(DAILY_MISSIONS));
        localStorage.setItem('neon_missions_date', today);
        this.saveMissions();
      }
    } else {
      // Reset for a new day
      this.missions = JSON.parse(JSON.stringify(DAILY_MISSIONS));
      localStorage.setItem('neon_missions_date', today);
      this.saveMissions();
    }
  }

  saveMissions() {
    try {
      localStorage.setItem('neon_missions', JSON.stringify(this.missions));
    } catch (e) {
      console.error('Failed to save missions to local storage', e);
    }
  }

  addTotalDistance(delta: number): Mission[] {
    const newlyCompleted: Mission[] = [];
    for (const m of this.missions) {
      if (m.completed) continue;
      if (m.type === 'DISTANCE_TOTAL') {
        m.progress += delta;
        if (m.progress >= m.target) {
           m.progress = m.target;
           m.completed = true;
           newlyCompleted.push(m);
           this.saveMissions();
        }
      }
    }
    return newlyCompleted;
  }

  updateRunProgress(coins: number, distance: number): Mission[] {
    const newlyCompleted: Mission[] = [];
    for (const m of this.missions) {
      if (m.completed) continue;
      if (m.type === 'COINS_ONE_RUN') {
        m.progress = Math.max(m.progress, coins);
        if (m.progress >= m.target) {
            m.completed = true;
            newlyCompleted.push(m);
            this.saveMissions();
        }
      } else if (m.type === 'DISTANCE_ONE_RUN') {
        m.progress = Math.max(m.progress, distance);
        if (m.progress >= m.target) {
            m.completed = true;
            newlyCompleted.push(m);
            this.saveMissions();
        }
      }
    }
    return newlyCompleted;
  }

  resetOneRunMissions() {
    let updated = false;
    for (const mission of this.missions) {
      if ((mission.type === 'COINS_ONE_RUN' || mission.type === 'DISTANCE_ONE_RUN') && !mission.completed) {
        mission.progress = 0;
        updated = true;
      }
    }
    if (updated) this.saveMissions();
  }
}
