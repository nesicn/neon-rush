import { AudioSystem } from './AudioSystem';
import { GameStats, GameState, GameEntity, PlayerState, Shockwave, GameNotification, StarParticle, RainParticle } from '../types';
import { MissionManager } from './MissionManager';
import { ProfileManager } from './ProfileManager';

export const SKIN_COLORS: Record<string, string> = {
  default: '#ff0055',
  cyan: '#00f3ff',
  pink: '#ff00ff',
  golden: '#ffea00'
};

const FOCAL_LENGTH = 300;
const CAMERA_HEIGHT = 200;
const HORIZON_Y_PERCENT = 0.45;
const LANE_OFFSETS = [-300, 0, 300];
const PLAYER_Z = 50;
const MAX_Z = 3000;
const MIN_Z = -200;

const COLORS = ['#00f3ff', '#ff0055', '#ffea00', '#b9005b', '#ff8a00'];

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio: AudioSystem;
  private onStateChange: (stats: GameStats) => void;
  
  private reqId: number = 0;
  private lastTime: number = 0;
  private lastUIUpdate: number = 0;

  private state: GameState = 'START';
  private score: number = 0;
  private coins: number = 0;
  private baseSpeed: number = 0;
  private roadOffset: number = 0;
  private rawDistance: number = 0;
  private missionManager: MissionManager;
  private profileManager: ProfileManager;
  private prevState: GameState = 'START';
  private shieldInvincibilityTimer: number = 0;
  private shockwaves: Shockwave[] = [];
  private notifications: GameNotification[] = [];

  private spawnTimer: number = 0;
  private powerupTimer: number = 0;

  private player: PlayerState = {
    lane: 1,
    x: 0,
    z: PLAYER_Z,
    targetX: 0,
    magnetTimer: 0,
    boostTimer: 0,
    crashed: false
  };

  private entities: GameEntity[] = [];
  private stars: StarParticle[] = [];
  private rain: RainParticle[] = [];

  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchActive: boolean = false;
  private swipeThreshold: number = 40;

  constructor(canvas: HTMLCanvasElement, onStateChange: (stats: GameStats) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onStateChange = onStateChange;
    this.audio = new AudioSystem();
    this.missionManager = new MissionManager();
    this.profileManager = new ProfileManager();

    this.initStars();
    this.initWeather();
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.handleKeyDown);

    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  public buySkin(id: string, cost: number) {
    if (this.profileManager.buySkin(id, cost)) this.updateUI();
  }
  public equipSkin(id: string) {
    this.profileManager.equipSkin(id);
    this.updateUI();
  }
  public buyMagnet(cost: number) {
    if (this.profileManager.buyMagnetUpgrade(cost)) this.updateUI();
  }
  public buyShield(cost: number) {
    if (this.profileManager.buyShield(cost)) this.updateUI();
  }
  public openShop() {
    this.prevState = this.state;
    this.state = 'SHOP';
    this.updateUI();
  }
  public closeShop() {
    this.state = this.prevState;
    this.updateUI();
  }

  public togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.updateUI();
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.lastTime = performance.now();
      this.loop(this.lastTime);
      this.updateUI();
    }
  }

  public init() {
    this.draw(); // Draw initial start screen frame
    this.updateUI();
  }

  public destroy() {
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    if (this.reqId) cancelAnimationFrame(this.reqId);
    this.audio.destroy();
  }

  public start() {
    this.audio.init();
    this.resetGame();
    this.state = 'PLAYING';
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public restart() {
    this.start();
  }

  private resetGame() {
    this.score = 0;
    this.coins = 0;
    this.baseSpeed = 800; // Base Z-units per second
    this.roadOffset = 0;
    this.rawDistance = 0;
    this.missionManager.resetOneRunMissions();
    this.spawnTimer = 1.0;
    this.powerupTimer = 10.0;
    this.entities = [];
    this.shieldInvincibilityTimer = 0;
    this.shockwaves = [];
    
    this.player = {
      lane: 1,
      x: LANE_OFFSETS[1],
      z: PLAYER_Z,
      targetX: LANE_OFFSETS[1],
      magnetTimer: 0,
      boostTimer: 0,
      crashed: false
    };
    this.updateUI();
  }

  private resize = () => {
    // Canvas rendering resolution
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    if (this.state === 'START') this.draw();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.player.crashed) return;

    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      this.togglePause();
      return;
    }

    if (this.state !== 'PLAYING') return;
    
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.player.lane = Math.max(0, this.player.lane - 1);
      this.player.targetX = LANE_OFFSETS[this.player.lane];
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.player.lane = Math.min(2, this.player.lane + 1);
      this.player.targetX = LANE_OFFSETS[this.player.lane];
    }
  }

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.touchActive = true;
    }
  }

  private handleTouchMove = (e: TouchEvent) => {
    if (this.state === 'PLAYING') {
      // Prevent scrolling the webpage when playing the game
      if (e.cancelable) {
        e.preventDefault();
      }
    }
    if (!this.touchActive || e.touches.length === 0 || this.player.crashed || this.state !== 'PLAYING') return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const diffX = currentX - this.touchStartX;
    const diffY = currentY - this.touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > this.swipeThreshold) {
        if (diffX > 0) {
          // Swipe Right
          this.player.lane = Math.min(2, this.player.lane + 1);
          this.player.targetX = LANE_OFFSETS[this.player.lane];
        } else {
          // Swipe Left
          this.player.lane = Math.max(0, this.player.lane - 1);
          this.player.targetX = LANE_OFFSETS[this.player.lane];
        }
        // Reset starting points so further drag is measured from this spot or requires a new touch
        this.touchStartX = currentX;
        this.touchStartY = currentY;
        // Optionally deactivate or keep tracking. Subway surfers lets you continuously swipe if you keep moving.
        // Let's set touchActive to false so a complete new swipe is needed for the next move, which is very precise and prevents runaway lane switching.
        this.touchActive = false;
      }
    }
  }

  private handleTouchEnd = () => {
    this.touchActive = false;
  }

  private initStars() {
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * HORIZON_Y_PERCENT,
        alpha: Math.random(),
        size: Math.random() * 2 + 1
      });
    }
  }

  private initWeather() {
    for (let i = 0; i < 300; i++) {
      this.rain.push({
        x: Math.random(),
        y: Math.random(),
        speed: Math.random() * 1.5 + 0.5,
        length: Math.random() * 40 + 10
      });
    }
  }

  private loop = (time: number) => {
    if (this.state !== 'PLAYING') return;

    let dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    
    // Prevent huge jumps if tab was inactive
    if (dt > 0.1) dt = 0.1;

    this.update(dt);
    this.draw();

    if (time - this.lastUIUpdate > 100) {
      this.updateUI();
      this.lastUIUpdate = time;
    }

    this.reqId = requestAnimationFrame(this.loop);
  }

  private update(dt: number) {
    if (this.player.crashed) return;

    // Progression
    this.baseSpeed += 15 * dt;
    let currentSpeed = this.baseSpeed;

    // Powerups timers
    if (this.player.boostTimer > 0) {
      this.player.boostTimer -= dt;
      currentSpeed *= 2.0; // Double speed during boost
    }
    if (this.player.magnetTimer > 0) {
      this.player.magnetTimer -= dt;
    }
    if (this.shieldInvincibilityTimer > 0) {
      this.shieldInvincibilityTimer -= dt;
    }

    const distanceDelta = currentSpeed * dt * 0.01;
    this.rawDistance += distanceDelta;
    this.score += distanceDelta;
    this.roadOffset = (this.roadOffset + currentSpeed * dt) % 300;

    // Update Missions
    const completed1 = this.missionManager.addTotalDistance(distanceDelta);
    const completed2 = this.missionManager.updateRunProgress(this.coins, this.rawDistance);
    const newlyCompleted = [...completed1, ...completed2];
    for (const m of newlyCompleted) {
      if (!m.claimed) {
        this.profileManager.addCoins(m.rewardCoins);
        m.claimed = true;
        this.missionManager.saveMissions();
        this.notifications.push({ text: `QUEST COMPLETE: ${m.description} (+${m.rewardCoins} COINS)`, timer: 3.0 });
      }
    }

    // Update notifications
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      this.notifications[i].timer -= dt;
      if (this.notifications[i].timer <= 0) {
        this.notifications.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += 800 * dt;
      sw.alpha -= 1.5 * dt;
      if (sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Player Movement (Smooth Lerp)
    this.player.x += (this.player.targetX - this.player.x) * 12 * dt;

    // Spawning logic
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.3, 1.5 - (this.baseSpeed / 2000));
      this.spawnObstacle();
      if (Math.random() > 0.5) this.spawnCoins();
    }

    this.powerupTimer -= dt;
    if (this.powerupTimer <= 0) {
      this.powerupTimer = 15.0 + Math.random() * 10.0;
      this.spawnPowerup();
    }

    // Update Weather
    const intensity = Math.min(1.0, Math.max(0, (this.baseSpeed - 800) / 2000));
    for (const drop of this.rain) {
      drop.y += (drop.speed * 2 + intensity * 4) * dt;
      if (drop.y > 1) {
        drop.y = -0.1;
        drop.x = Math.random();
      }
    }

    // Update Entities & Check Collisions
    const isInvincible = this.player.boostTimer > 0;
    
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      
      // Different movement speeds based on type
      let entVelocity = currentSpeed; 
      if (ent.type === 'OBSTACLE') {
        entVelocity = currentSpeed - (this.baseSpeed * 0.5); // Obstacles move slower than player
      }

      ent.z -= entVelocity * dt;

      // Magnet Logic
      if (ent.type === 'COIN' && this.player.magnetTimer > 0) {
        if (ent.z < 1500 && ent.z > PLAYER_Z - 100) {
          ent.x += (this.player.x - ent.x) * 8 * dt;
        }
      }

      // Cleanup
      if (ent.z < MIN_Z || ent.collected) {
        this.entities.splice(i, 1);
        continue;
      }

      // Collision Detection
      if (Math.abs(ent.z - PLAYER_Z) < 40) {
        if (Math.abs(ent.x - this.player.x) < 120) {
          if (ent.type === 'OBSTACLE') {
            if (isInvincible) {
              ent.collected = true; // Blast it away
              this.audio.playCrash();
            } else if (this.shieldInvincibilityTimer > 0) {
              // Pass through safely
            } else if (this.profileManager.getProfile().upgrades.shieldOwned) {
              ent.collected = true;
              this.profileManager.useShield();
              this.shieldInvincibilityTimer = 1.5;
              this.shockwaves.push({ x: this.player.x, z: this.player.z, radius: 0, alpha: 1.0 });
              this.audio.playCrash();
              this.updateUI();
            } else {
              this.handleCrash();
            }
          } else if (ent.type === 'COIN') {
            ent.collected = true;
            this.coins++;
            this.audio.playCoin();
          } else if (ent.type === 'MAGNET') {
            ent.collected = true;
            const level = this.profileManager.getProfile().upgrades.magnetDurationLevel;
            this.player.magnetTimer = 6 + (2 * level);
            this.audio.playBoost();
          } else if (ent.type === 'BOOST') {
            ent.collected = true;
            this.player.boostTimer = 5.0;
            this.audio.playBoost();
          }
        }
      }
    }
  }

  private handleCrash() {
    this.player.crashed = true;
    this.state = 'GAMEOVER';
    this.audio.playCrash();
    
    this.profileManager.addCoins(this.coins);
    this.profileManager.setHighScore(this.score);
    
    this.updateUI();
  }

  private spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    this.entities.push({
      id: Math.random(),
      type: 'OBSTACLE',
      lane,
      x: LANE_OFFSETS[lane],
      z: MAX_Z,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
  }

  private spawnCoins() {
    const lane = Math.floor(Math.random() * 3);
    const count = Math.floor(Math.random() * 5) + 3;
    for (let i = 0; i < count; i++) {
      this.entities.push({
        id: Math.random(),
        type: 'COIN',
        lane,
        x: LANE_OFFSETS[lane],
        z: MAX_Z + (i * 150)
      });
    }
  }

  private spawnPowerup() {
    const lane = Math.floor(Math.random() * 3);
    this.entities.push({
      id: Math.random(),
      type: Math.random() > 0.5 ? 'MAGNET' : 'BOOST',
      lane,
      x: LANE_OFFSETS[lane],
      z: MAX_Z
    });
  }

  private project(x: number, y: number, z: number) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const horizonY = h * HORIZON_Y_PERCENT;
    
    // Safety clamp to prevent divide by zero or negative scale
    const safeZ = Math.max(z, -FOCAL_LENGTH + 1);
    const scale = FOCAL_LENGTH / (safeZ + FOCAL_LENGTH);
    
    const sx = w / 2 + x * scale;
    const sy = horizonY + (CAMERA_HEIGHT - y) * scale;
    
    return { x: sx, y: sy, scale };
  }

  private draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const horizonY = h * HORIZON_Y_PERCENT;

    // 1. Sky & Sun
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, '#12042c');
    skyGrad.addColorStop(0.5, '#3b0754');
    skyGrad.addColorStop(1, '#b9005b');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, w, horizonY);

    // Stars
    this.ctx.fillStyle = '#fff';
    const t = performance.now() / 1000;
    for (const star of this.stars) {
      const flicker = Math.sin(t * 5 + star.x * 100) * 0.5 + 0.5;
      this.ctx.globalAlpha = star.alpha * flicker;
      this.ctx.beginPath();
      this.ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;

    // Sun
    const sunRadius = h * 0.3;
    const sunGrad = this.ctx.createLinearGradient(w/2, horizonY - sunRadius, w/2, horizonY);
    sunGrad.addColorStop(0, '#ff8a00');
    sunGrad.addColorStop(1, '#e52e71');
    this.ctx.fillStyle = sunGrad;
    this.ctx.shadowBlur = 80;
    this.ctx.shadowColor = 'rgba(255,138,0,0.5)';
    this.ctx.beginPath();
    this.ctx.arc(w / 2, horizonY, sunRadius, Math.PI, 0);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    // Sun slices
    this.ctx.fillStyle = '#12042c';
    this.ctx.globalAlpha = 0.5;
    for (let i = 1; i <= 6; i++) {
        this.ctx.fillRect(w/2 - sunRadius, horizonY - (i * 20), sunRadius * 2, i * 2);
    }
    this.ctx.globalAlpha = 1.0;

    // Mountains
    this.ctx.fillStyle = '#1a0b3a';
    this.ctx.beginPath();
    this.ctx.moveTo(w/2 - 400, horizonY);
    this.ctx.lineTo(w/2 - 200, horizonY - 100);
    this.ctx.lineTo(w/2, horizonY);
    this.ctx.fill();

    this.ctx.fillStyle = '#2d0b5a';
    this.ctx.beginPath();
    this.ctx.moveTo(w/2 - 200, horizonY);
    this.ctx.lineTo(w/2 + 100, horizonY - 150);
    this.ctx.lineTo(w/2 + 400, horizonY);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#1a0b3a';
    this.ctx.globalAlpha = 0.8;
    this.ctx.beginPath();
    this.ctx.moveTo(w/2 + 100, horizonY);
    this.ctx.lineTo(w/2 + 250, horizonY - 80);
    this.ctx.lineTo(w/2 + 500, horizonY);
    this.ctx.fill();
    this.ctx.globalAlpha = 1.0;

    // 2. Ground & Road Background
    this.ctx.fillStyle = '#0d0221';
    this.ctx.fillRect(0, horizonY, w, h - horizonY);

    this.ctx.fillStyle = '#1b1b1b';
    this.ctx.beginPath();
    const bl = this.project(-450, 0, MIN_Z);
    const br = this.project(450, 0, MIN_Z);
    const tl = this.project(-450, 0, MAX_Z);
    const tr = this.project(450, 0, MAX_Z);
    this.ctx.moveTo(bl.x, bl.y);
    this.ctx.lineTo(br.x, br.y);
    this.ctx.lineTo(tr.x, tr.y);
    this.ctx.lineTo(tl.x, tl.y);
    this.ctx.fill();

    // 3. Grid & Lane Dividers
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = 'rgba(0, 243, 255, 0.8)';
    this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)';
    for (let z = MIN_Z; z <= MAX_Z + 300; z += 150) {
      let actualZ = z - this.roadOffset;
      if (actualZ < MIN_Z || actualZ > MAX_Z) continue;
      
      const pLeft = this.project(-450, 0, actualZ);
      const pRight = this.project(450, 0, actualZ);
      this.ctx.lineWidth = Math.max(1, pLeft.scale * 3);
      
      this.ctx.beginPath();
      this.ctx.moveTo(pLeft.x, pLeft.y);
      this.ctx.lineTo(pRight.x, pRight.y);
      this.ctx.stroke();
    }
    this.ctx.shadowBlur = 0;

    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    for (let x of [-150, 150]) {
      for (let z = MIN_Z; z <= MAX_Z + 300; z += 100) {
        let actualZ = z - (this.roadOffset % 100);
        if (actualZ < MIN_Z || actualZ > MAX_Z - 100) continue;
        
        const p1 = this.project(x, 0, actualZ);
        const p2 = this.project(x, 0, actualZ + 50);
        this.ctx.lineWidth = Math.max(1, p1.scale * 6);
        
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      }
    }
    this.ctx.shadowBlur = 0;

    // 4. Background Fog
    const intensity = Math.min(1.0, Math.max(0, (this.baseSpeed - 800) / 2000));
    if (intensity > 0) {
      const fogGrad = this.ctx.createLinearGradient(0, horizonY - 150, 0, horizonY + 200);
      fogGrad.addColorStop(0, `rgba(18, 4, 44, 0)`);
      fogGrad.addColorStop(0.5, `rgba(59, 7, 84, ${intensity * 0.95})`);
      fogGrad.addColorStop(1, `rgba(13, 2, 33, 0)`);
      this.ctx.fillStyle = fogGrad;
      this.ctx.fillRect(0, horizonY - 150, w, 350);
    }

    // 5. Sort and Draw Entities (Painter's Algorithm)
    const renderables = [...this.entities];
    renderables.sort((a, b) => b.z - a.z);

    let playerDrawn = false;
    for (const ent of renderables) {
      let entAlpha = 1.0;
      if (intensity > 0) {
        const fogStart = 500;
        if (ent.z > fogStart) {
          const fade = Math.min(1.0, (ent.z - fogStart) / (MAX_Z - fogStart));
          entAlpha = 1.0 - (fade * intensity);
        }
      }

      if (ent.z < PLAYER_Z && !playerDrawn) {
        this.ctx.globalAlpha = this.shieldInvincibilityTimer > 0 ? (Math.floor(performance.now() / 100) % 2 === 0 ? 0.5 : 1.0) : 1.0;
        const equippedSkin = this.profileManager.getProfile().equippedSkin;
        const playerColor = SKIN_COLORS[equippedSkin] || '#ff0055';
        this.drawCar(this.player.x, this.player.z, playerColor, true);
        playerDrawn = true;
      }
      
      this.ctx.globalAlpha = Math.max(0, entAlpha);

      if (ent.type === 'OBSTACLE') {
        this.drawCar(ent.x, ent.z, ent.color || '#fff', false);
      } else if (ent.type === 'COIN') {
        this.drawCollectible(ent.x, ent.z, '#ffea00', true);
      } else if (ent.type === 'MAGNET') {
        this.drawCollectible(ent.x, ent.z, '#ffea00', false);
      } else if (ent.type === 'BOOST') {
        this.drawCollectible(ent.x, ent.z, '#00f3ff', false);
      }

      this.ctx.globalAlpha = 1.0;
    }

    if (!playerDrawn) {
      this.ctx.globalAlpha = this.shieldInvincibilityTimer > 0 ? (Math.floor(performance.now() / 100) % 2 === 0 ? 0.5 : 1.0) : 1.0;
      const equippedSkin = this.profileManager.getProfile().equippedSkin;
      const playerColor = SKIN_COLORS[equippedSkin] || '#ff0055';
      this.drawCar(this.player.x, this.player.z, playerColor, true);
    }
    
    // Draw shockwaves
    this.ctx.globalAlpha = 1.0;
    for (const sw of this.shockwaves) {
      const p = this.project(sw.x, 0, sw.z);
      this.ctx.strokeStyle = `rgba(0, 243, 255, ${sw.alpha})`;
      this.ctx.lineWidth = 10 * p.scale;
      this.ctx.beginPath();
      this.ctx.ellipse(p.x, p.y, sw.radius * p.scale, sw.radius * 0.3 * p.scale, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Draw Speed Lines if Boost Active
    if (this.player.boostTimer > 0) {
        this.drawSpeedLines(w, h);
    }

    // Draw Rain particles
    if (intensity > 0) {
      this.ctx.strokeStyle = `rgba(0, 243, 255, ${intensity * 0.6})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      
      const rainCount = Math.floor(this.rain.length * intensity);
      for (let i = 0; i < rainCount; i++) {
        const drop = this.rain[i];
        const px = drop.x * w;
        const py = drop.y * h;
        // Slant rain outward from center
        const slant = (drop.x - 0.5) * 150 * intensity;
        this.ctx.moveTo(px, py);
        this.ctx.lineTo(px + slant, py + drop.length);
      }
      this.ctx.stroke();
    }
  }

  private drawCar(x: number, z: number, color: string, isPlayer: boolean) {
    // 3D Dimensions
    const w = 140;
    const l = 120;
    const bodyH = 45;
    const groundCl = 15;

    const cw = 100;
    const cl = 60;
    const ch = 40;
    const cZOff = 30; // offset from rear

    // Vertices for Body
    const rbl = this.project(x - w/2, groundCl, z);
    const rbr = this.project(x + w/2, groundCl, z);
    const rtl = this.project(x - w/2, groundCl + bodyH, z);
    const rtr = this.project(x + w/2, groundCl + bodyH, z);

    const fbl = this.project(x - w/2, groundCl, z + l);
    const fbr = this.project(x + w/2, groundCl, z + l);
    const ftl = this.project(x - w/2, groundCl + bodyH, z + l);
    const ftr = this.project(x + w/2, groundCl + bodyH, z + l);

    // Vertices for Cabin
    const crbl = this.project(x - cw/2, groundCl + bodyH, z + cZOff);
    const crbr = this.project(x + cw/2, groundCl + bodyH, z + cZOff);
    const crtl = this.project(x - cw/2 * 0.8, groundCl + bodyH + ch, z + cZOff + 25);
    const crtr = this.project(x + cw/2 * 0.8, groundCl + bodyH + ch, z + cZOff + 25);
    
    const cfbl = this.project(x - cw/2, groundCl + bodyH, z + cZOff + cl);
    const cfbr = this.project(x + cw/2, groundCl + bodyH, z + cZOff + cl);
    const cftl = this.project(x - cw/2 * 0.8, groundCl + bodyH + ch, z + cZOff + cl - 20);
    const cftr = this.project(x + cw/2 * 0.8, groundCl + bodyH + ch, z + cZOff + cl - 20);

    const scale = rbl.scale;

    const quad = (p1: any, p2: any, p3: any, p4: any, fill: string, stroke: string = '') => {
      this.ctx.fillStyle = fill;
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.lineTo(p3.x, p3.y);
      this.ctx.lineTo(p4.x, p4.y);
      this.ctx.closePath();
      this.ctx.fill();
      if (stroke) {
        this.ctx.strokeStyle = stroke;
        this.ctx.lineWidth = 1.5 * scale;
        this.ctx.stroke();
      }
    };

    // 1. Drop Shadow
    const shadowP1 = this.project(x - w/2 - 10, 2, z - 10);
    const shadowP2 = this.project(x + w/2 + 10, 2, z - 10);
    const shadowP3 = this.project(x + w/2 + 10, 2, z + l + 10);
    const shadowP4 = this.project(x - w/2 - 10, 2, z + l + 10);
    quad(shadowP4, shadowP3, shadowP2, shadowP1, 'rgba(0,0,0,0.6)');

    // 2. Wheels
    const drawWheel = (wx: number, wz: number) => {
       const wp = this.project(wx, groundCl, wz);
       this.ctx.fillStyle = '#050505';
       this.ctx.beginPath();
       this.ctx.ellipse(wp.x, wp.y, 20 * wp.scale, 35 * wp.scale, 0, 0, Math.PI*2);
       this.ctx.fill();
    };
    drawWheel(x - w/2 - 5, z + 20); // Rear left
    drawWheel(x + w/2 + 5, z + 20); // Rear right
    drawWheel(x - w/2 - 5, z + l - 20); // Front left
    drawWheel(x + w/2 + 5, z + l - 20); // Front right

    const darkColor = isPlayer ? '#111' : '#1a0505';
    const mainColor = isPlayer ? color : '#330011';
    const highlight = isPlayer ? color : '#ff0055';
    const windowColor = '#0a1520';
    const windowGlow = isPlayer ? '#00f3ff' : '#ff0055';
    
    // Front face
    quad(fbl, fbr, ftr, ftl, darkColor);

    // Side faces (Body)
    quad(fbl, rbl, rtl, ftl, darkColor, highlight); // Left side
    quad(rbr, fbr, ftr, rtr, darkColor, highlight); // Right side

    // Top face (Body)
    quad(ftl, ftr, rtr, rtl, mainColor, highlight);

    // Cabin Side Faces
    quad(cfbl, crbl, crtl, cftl, darkColor, highlight);
    quad(crbr, cfbr, cftr, crtr, darkColor, highlight);

    // Cabin Top
    quad(cftl, cftr, crtr, crtl, mainColor, highlight);

    // Cabin Windshield (Front)
    quad(cfbl, cfbr, cftr, cftl, windowColor);

    // Cabin Rear Window
    this.ctx.shadowBlur = 10 * scale;
    this.ctx.shadowColor = windowGlow;
    quad(crbl, crbr, crtr, crtl, windowColor, windowGlow);
    this.ctx.shadowBlur = 0;

    // Rear face (Body)
    this.ctx.shadowBlur = 15 * scale;
    this.ctx.shadowColor = highlight;
    quad(rbl, rbr, rtr, rtl, mainColor, highlight);
    this.ctx.shadowBlur = 0;

    // Details - Taillights
    const tlY1 = groundCl + bodyH * 0.4;
    const tlY2 = groundCl + bodyH * 0.8;
    const trbl = this.project(x - w/2 + 10, tlY1, z);
    const trtl = this.project(x - w/2 + 10, tlY2, z);
    const trbr = this.project(x - 20, tlY1, z);
    const trtr = this.project(x - 20, tlY2, z);

    const tlbl = this.project(x + 20, tlY1, z);
    const tltl = this.project(x + 20, tlY2, z);
    const tlbr = this.project(x + w/2 - 10, tlY1, z);
    const tltr = this.project(x + w/2 - 10, tlY2, z);

    this.ctx.shadowBlur = (isPlayer ? 25 : 15) * scale;
    this.ctx.shadowColor = isPlayer ? color : '#ff0000';
    quad(trbl, trbr, trtr, trtl, isPlayer ? '#fff' : '#ff5555', isPlayer ? color : '#ff0000');
    quad(tlbl, tlbr, tltr, tltl, isPlayer ? '#fff' : '#ff5555', isPlayer ? color : '#ff0000');
    this.ctx.shadowBlur = 0;

    // Engine Exhaust Glow for player
    if (isPlayer) {
      const ex1 = this.project(x - w * 0.25, groundCl + 10, z);
      const ex2 = this.project(x + w * 0.25, groundCl + 10, z);
      this.ctx.shadowBlur = 20 * scale;
      this.ctx.shadowColor = '#00f3ff';
      this.ctx.fillStyle = '#fff';
      
      this.ctx.beginPath();
      this.ctx.arc(ex1.x, ex1.y, 8 * scale, 0, Math.PI*2);
      this.ctx.fill();
      
      this.ctx.beginPath();
      this.ctx.arc(ex2.x, ex2.y, 8 * scale, 0, Math.PI*2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      // Boost Trails
      if (this.player.boostTimer > 0) {
        this.ctx.fillStyle = '#00f3ff';
        this.ctx.shadowBlur = 30 * scale;
        this.ctx.shadowColor = '#00f3ff';
        this.ctx.beginPath();
        this.ctx.arc(ex1.x, ex1.y, (15 + Math.random()*15) * scale, 0, Math.PI*2);
        this.ctx.arc(ex2.x, ex2.y, (15 + Math.random()*15) * scale, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    }
  }

  private drawCollectible(x: number, z: number, color: string, isCoin: boolean) {
    const p = this.project(x, 40, z);
    const r = 30 * p.scale;
    const t = performance.now() / 200;
    
    this.ctx.fillStyle = color;
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = color;
    
    this.ctx.beginPath();
    if (isCoin) {
      const spinW = Math.max(0.1, Math.abs(Math.cos(t))) * r;
      this.ctx.ellipse(p.x, p.y, spinW, r, 0, 0, Math.PI * 2);
    } else {
      // Diamond for powerups
      this.ctx.moveTo(p.x, p.y - r);
      this.ctx.lineTo(p.x + r, p.y);
      this.ctx.lineTo(p.x, p.y + r);
      this.ctx.lineTo(p.x - r, p.y);
    }
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }
  
  private drawSpeedLines(w: number, h: number) {
      this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      for (let i=0; i<20; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const len = Math.random() * 200 + 50;
          this.ctx.moveTo(x, y);
          this.ctx.lineTo(x, y + len);
      }
      this.ctx.stroke();
  }

  private updateUI() {
    this.onStateChange({
      state: this.state,
      score: Math.floor(this.score),
      coins: this.coins,
      speed: Math.floor(this.baseSpeed / 10),
      magnetTimer: this.player.magnetTimer,
      boostTimer: this.player.boostTimer,
      shieldActive: this.profileManager.getProfile().upgrades.shieldOwned,
      missions: this.missionManager.missions,
      profile: this.profileManager.getProfile(),
      notifications: this.notifications.map(n => n.text)
    });
  }
}
