import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import { UIOverlay } from './UIOverlay';
import { GameStats } from '../types';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  
  const [stats, setStats] = useState<GameStats>({
    state: 'START',
    score: 0,
    coins: 0,
    speed: 0,
    magnetTimer: 0,
    boostTimer: 0,
    shieldActive: false,
    missions: [],
    profile: {
      totalCoins: 0,
      highScore: 0,
      unlockedSkins: ['default'],
      equippedSkin: 'default',
      upgrades: { magnetDurationLevel: 1, shieldOwned: false }
    },
    notifications: []
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine(canvasRef.current, setStats);
    engineRef.current = engine;
    engine.init();

    return () => {
      engine.destroy();
    };
  }, []);

  const handleStart = () => {
    engineRef.current?.start();
  };

  const handleRestart = () => {
    engineRef.current?.restart();
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 block w-full h-full"
      />
      <UIOverlay 
        stats={stats} 
        onStart={handleStart} 
        onRestart={handleRestart}
        onOpenShop={() => engineRef.current?.openShop()}
        onCloseShop={() => engineRef.current?.closeShop()}
        onBuySkin={(id, cost) => engineRef.current?.buySkin(id, cost)}
        onEquipSkin={(id) => engineRef.current?.equipSkin(id)}
        onBuyMagnet={(cost) => engineRef.current?.buyMagnet(cost)}
        onBuyShield={(cost) => engineRef.current?.buyShield(cost)}
      />
    </div>
  );
}
