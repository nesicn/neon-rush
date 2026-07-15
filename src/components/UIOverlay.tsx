import { GameStats } from '../types';
import { SKIN_COLORS } from '../game/GameEngine';

interface UIOverlayProps {
  stats: GameStats;
  onStart: () => void;
  onRestart: () => void;
  onOpenShop: () => void;
  onCloseShop: () => void;
  onBuySkin: (id: string, cost: number) => void;
  onEquipSkin: (id: string) => void;
  onBuyMagnet: (cost: number) => void;
  onBuyShield: (cost: number) => void;
}

const SKINS = [
  { id: 'default', name: 'Standard', cost: 0 },
  { id: 'cyan', name: 'Neon Cyan', cost: 150 },
  { id: 'pink', name: 'Cyberpunk Pink', cost: 300 },
  { id: 'golden', name: 'Golden Horizon', cost: 500 }
];

export function UIOverlay({ stats, onStart, onRestart, onOpenShop, onCloseShop, onBuySkin, onEquipSkin, onBuyMagnet, onBuyShield }: UIOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 font-sans flex flex-col justify-between">
      {/* Notifications */}
      {stats.notifications && stats.notifications.length > 0 && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center z-50">
          {stats.notifications.map((msg, idx) => (
             <div key={idx} className="px-6 py-2 bg-[#ffea00]/20 backdrop-blur-md border border-[#ffea00] text-[#ffea00] font-bold tracking-widest rounded-lg shadow-[0_0_20px_rgba(255,234,0,0.5)] animate-bounce text-sm">
               {msg}
             </div>
          ))}
        </div>
      )}

      {/* HUD - Always Visible when playing or paused */}
      {(stats.state === 'PLAYING' || stats.state === 'PAUSED') && (
        <>
          <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start pointer-events-none">
            <div className="flex flex-col gap-2">
              <div className="text-[#00f3ff] text-xs font-bold tracking-[0.3em] uppercase">Distance</div>
              <div className="text-4xl font-black italic tracking-tighter text-white drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                {String(Math.floor(stats.score)).padStart(6, '0')} <span className="text-lg text-[#00f3ff]">M</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-[#ff0055] text-[10px] uppercase font-bold tracking-widest">Record</div>
                <div className="text-sm text-white/50">{String(stats.profile?.highScore || 0).padStart(6, '0')} M</div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="text-[#ffea00] text-xs font-bold tracking-[0.3em] uppercase">Session Gold</div>
              <div className="text-4xl font-black italic tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,234,0,0.5)] flex items-center gap-2">
                <div className="w-6 h-8 rounded-full bg-[#ffea00] shadow-[0_0_15px_#ffea00] rotate-12"></div>
                {stats.coins}
              </div>
              <div className="text-white/30 text-[10px] uppercase tracking-widest mt-2">Press P or Esc to pause</div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full p-8 flex justify-between items-end pointer-events-none">
            <div className="w-80 flex flex-col gap-4">
              <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[#00f3ff] text-[10px] font-bold uppercase tracking-widest">Nitro Boost</span>
                  <span className="text-[10px] font-mono text-white/70">{stats.boostTimer > 0 ? 'ACTIVE' : 'OFF'}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#00f3ff] shadow-[0_0_10px_#00f3ff] transition-all duration-100 ease-linear"
                    style={{ width: `${Math.max(0, (stats.boostTimer / 5.0) * 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[#ffea00] text-[10px] font-bold uppercase tracking-widest">Magnet Field</span>
                  <span className="text-[10px] font-mono text-white/70">{stats.magnetTimer > 0 ? 'ACTIVE' : 'OFF'}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#ffea00] shadow-[0_0_10px_#ffea00] transition-all duration-100 ease-linear"
                    style={{ width: `${Math.max(0, (stats.magnetTimer / (6 + 2 * (stats.profile?.upgrades?.magnetDurationLevel || 1))) * 100)}%` }}
                  ></div>
                </div>
              </div>
              {stats.shieldActive && (
                <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-purple-400 text-[10px] font-bold uppercase tracking-widest">Energy Shield</span>
                    <span className="text-[10px] font-mono text-white/70">DEPLOYED</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 shadow-[0_0_10px_#a855f7] w-full animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end">
              <div className="text-[#00f3ff] text-[10px] font-bold uppercase tracking-[0.4em] mb-1">Velocity</div>
              <div className="flex items-baseline gap-2 text-white drop-shadow-[0_0_15px_rgba(255,0,85,0.5)]">
                <div className="text-7xl font-black italic tracking-tighter">{stats.speed}</div>
                <div className="text-2xl font-bold text-[#ff0055]">MPH</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Menus */}
      {stats.state === 'START' && (
        <div className="absolute inset-0 bg-[#0d0221]/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
          <div className="absolute top-8 right-8 flex gap-4">
            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-white/10">
              <div className="w-4 h-4 rounded-full bg-[#ffea00] shadow-[0_0_10px_#ffea00]"></div>
              <span className="text-[#ffea00] font-bold font-mono">{stats.profile?.totalCoins || 0}</span>
            </div>
            <button onClick={onOpenShop} className="px-6 py-2 bg-purple-600/20 border border-purple-500 text-purple-400 uppercase tracking-widest font-bold text-xs hover:bg-purple-600/40 rounded-lg transition-colors cursor-pointer">
              Open Market
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-7xl md:text-8xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-[#00f3ff] to-[#ff0055] drop-shadow-[0_0_20px_rgba(255,0,85,0.4)] mb-2 px-4">
              NEON RUNNER
            </h1>
            <div className="text-[12px] text-white/50 tracking-[0.5em] uppercase mt-2 mb-8">Infinite Highway Protocol</div>
            
            <div className="text-[12px] text-[#ff0055] tracking-[0.3em] uppercase mb-12 font-bold flex flex-col items-center gap-1">
               <span className="text-white/50">High Score</span>
               <span className="text-2xl drop-shadow-[0_0_10px_rgba(255,0,85,0.5)]">{String(stats.profile?.highScore || 0).padStart(6, '0')} M</span>
            </div>
            
            <button 
              onClick={onStart}
              className="px-10 py-5 bg-black/40 backdrop-blur-md border border-[#00f3ff]/50 text-[#00f3ff] font-bold text-xl tracking-[0.3em] uppercase hover:bg-[#00f3ff]/10 hover:shadow-[0_0_30px_rgba(0,243,255,0.3)] hover:-translate-y-1 transition-all cursor-pointer rounded-xl"
            >
              Initialize Engine
            </button>
            <div className="mt-12 text-white/40 text-xs tracking-[0.2em] uppercase font-bold flex flex-col gap-2">
              <p>Controls: A / D or LEFT / RIGHT to switch lanes</p>
              <p className="text-[#ff0055]">Avoid traffic. Collect gold reserves.</p>
            </div>
            
            <div className="mt-8 flex flex-col gap-4 w-[400px] bg-black/40 backdrop-blur-md p-6 rounded-xl border border-white/10 text-left pointer-events-none mx-auto">
              <div className="text-[#00f3ff] text-[10px] font-bold uppercase tracking-[0.3em] mb-2 text-center">Daily Directives</div>
              {stats.missions && stats.missions.map(m => (
                <div key={m.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs tracking-wide font-bold ${m.completed ? 'text-white/30 line-through' : 'text-white'}`}>{m.description}</span>
                    <span className="text-[#ffea00] text-[10px] font-bold tracking-widest text-right whitespace-nowrap">+{m.rewardCoins} COINS</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full shadow-[0_0_10px_currentColor] transition-all duration-300 ease-out ${m.completed ? 'bg-[#ffea00] text-[#ffea00]' : 'bg-[#00f3ff] text-[#00f3ff]'}`}
                      style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {stats.state === 'PAUSED' && (
        <div className="absolute inset-0 bg-[#0d0221]/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto z-40">
          <h2 className="text-7xl md:text-8xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] mb-8">
            PAUSED
          </h2>
          <div className="text-white/50 text-xs uppercase tracking-[0.3em] mb-12">Press P or ESC to resume</div>
        </div>
      )}

      {stats.state === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-[#0d0221]/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto">
          <div className="absolute top-8 right-8 flex gap-4">
            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-white/10">
              <div className="w-4 h-4 rounded-full bg-[#ffea00] shadow-[0_0_10px_#ffea00]"></div>
              <span className="text-[#ffea00] font-bold font-mono">{stats.profile?.totalCoins || 0}</span>
            </div>
            <button onClick={onOpenShop} className="px-6 py-2 bg-purple-600/20 border border-purple-500 text-purple-400 uppercase tracking-widest font-bold text-xs hover:bg-purple-600/40 rounded-lg transition-colors cursor-pointer">
              Open Market
            </button>
          </div>

          <h2 className="text-7xl font-black italic tracking-tighter text-[#ff0055] drop-shadow-[0_0_30px_rgba(255,0,85,0.6)] mb-8">
            CRITICAL FAILURE
          </h2>
          
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-10 rounded-2xl min-w-[350px] flex flex-col gap-6 text-center">
            <div className="flex flex-col gap-1">
              <div className="text-[#00f3ff] text-[10px] font-bold uppercase tracking-[0.3em]">Final Distance</div>
              <div className="text-5xl font-black italic text-white tracking-tighter">{String(Math.floor(stats.score)).padStart(6, '0')} M</div>
            </div>
            
            <div className="flex justify-between items-center border-t border-white/10 pt-6">
              <span className="text-white/50 text-[10px] uppercase tracking-widest font-bold">Gold Collected</span>
              <span className="text-[#ffea00] font-black italic text-2xl flex items-center gap-2">
                <div className="w-3 h-4 rounded-full bg-[#ffea00] shadow-[0_0_10px_#ffea00] rotate-12"></div>
                +{stats.coins}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-white/10 pt-6">
              <span className="text-white/50 text-[10px] uppercase tracking-widest font-bold">Record</span>
              <span className="text-[#00f3ff] font-black italic text-xl tracking-tighter">{String(stats.profile?.highScore || 0).padStart(6, '0')} M</span>
            </div>
            
            <div className="border-t border-white/10 pt-6 flex flex-col gap-3">
              <div className="text-white/50 text-[10px] uppercase tracking-[0.3em] font-bold text-left mb-1">Directive Status</div>
              {stats.missions && stats.missions.map(m => (
                <div key={m.id} className="flex flex-col gap-1 text-left">
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-bold tracking-wider ${m.completed ? 'text-[#ffea00]' : 'text-white/70'}`}>{m.description}</span>
                    <span className="text-[10px] font-mono text-white/50">{Math.floor(m.progress)} / {m.target}</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full shadow-[0_0_10px_currentColor] transition-all duration-300 ${m.completed ? 'bg-[#ffea00] text-[#ffea00]' : 'bg-[#00f3ff] text-[#00f3ff]'}`}
                      style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={onRestart}
            className="mt-12 px-10 py-5 bg-[#ff0055]/20 backdrop-blur-md border border-[#ff0055]/50 text-[#ff0055] font-bold text-xl tracking-[0.3em] uppercase hover:bg-[#ff0055]/30 hover:shadow-[0_0_30px_rgba(255,0,85,0.3)] hover:-translate-y-1 transition-all cursor-pointer rounded-xl"
          >
            Reboot System
          </button>
        </div>
      )}

      {stats.state === 'SHOP' && (
        <div className="absolute inset-0 bg-[#0d0221]/95 backdrop-blur-xl flex flex-col items-center justify-start py-12 px-8 pointer-events-auto overflow-y-auto z-40">
          <div className="w-full max-w-4xl">
            <div className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
              <h2 className="text-4xl font-black italic tracking-tighter text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                BLACK MARKET
              </h2>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 bg-black/40 px-6 py-3 rounded-lg border border-[#ffea00]/30 shadow-[0_0_15px_rgba(255,234,0,0.1)]">
                  <div className="w-4 h-4 rounded-full bg-[#ffea00] shadow-[0_0_10px_#ffea00]"></div>
                  <span className="text-[#ffea00] font-bold font-mono text-xl">{stats.profile?.totalCoins || 0}</span>
                </div>
                <button onClick={onCloseShop} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white/50 hover:text-white">
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="flex flex-col gap-4">
                <h3 className="text-[#00f3ff] text-sm font-bold uppercase tracking-[0.3em] mb-2">Vehicle Skins</h3>
                <div className="grid grid-cols-1 gap-3">
                  {SKINS.map(skin => {
                    const isUnlocked = stats.profile?.unlockedSkins.includes(skin.id);
                    const isEquipped = stats.profile?.equippedSkin === skin.id;
                    const canAfford = (stats.profile?.totalCoins || 0) >= skin.cost;
                    const skinColor = SKIN_COLORS[skin.id] || '#ff0055';
                    
                    return (
                      <div key={skin.id} className={`flex items-center justify-between p-4 rounded-xl border ${isEquipped ? 'bg-white/10 border-white/40' : 'bg-black/40 border-white/10'}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-6 rounded border border-white/20 shadow-lg" style={{ backgroundColor: skinColor, boxShadow: `0 0 15px ${skinColor}80` }}></div>
                          <div className="flex flex-col">
                            <span className="text-white font-bold tracking-wide">{skin.name}</span>
                            {!isUnlocked && <span className="text-[#ffea00] text-xs font-mono">{skin.cost} Coins</span>}
                          </div>
                        </div>
                        <div>
                          {isEquipped ? (
                            <div className="px-4 py-2 bg-white/20 text-white text-[10px] uppercase tracking-widest rounded font-bold">Equipped</div>
                          ) : isUnlocked ? (
                            <button onClick={() => onEquipSkin(skin.id)} className="px-4 py-2 bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/50 hover:bg-[#00f3ff]/40 text-[10px] uppercase tracking-widest rounded font-bold cursor-pointer transition-colors">Equip</button>
                          ) : (
                            <button 
                              onClick={() => onBuySkin(skin.id, skin.cost)} 
                              disabled={!canAfford}
                              className={`px-4 py-2 border text-[10px] uppercase tracking-widest rounded font-bold transition-colors ${canAfford ? 'bg-[#ffea00]/20 text-[#ffea00] border-[#ffea00]/50 hover:bg-[#ffea00]/40 cursor-pointer' : 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed'}`}
                            >
                              Buy
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-pink-400 text-sm font-bold uppercase tracking-[0.3em] mb-2">System Upgrades</h3>
                
                {/* Magnet Upgrade */}
                <div className="flex flex-col p-6 rounded-xl border bg-black/40 border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffea00]/5 blur-3xl rounded-full"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col z-10">
                      <span className="text-white font-bold text-lg tracking-wide">Magnet Booster</span>
                      <span className="text-white/50 text-xs mt-1">Increases attraction field duration.</span>
                    </div>
                    <span className="text-[#ffea00] font-mono text-sm border border-[#ffea00]/30 px-2 py-1 rounded bg-[#ffea00]/10 z-10">Lvl {stats.profile?.upgrades?.magnetDurationLevel || 1}/5</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 z-10">
                    <div className="text-[#00f3ff] text-sm font-mono">Duration: {6 + (2 * (stats.profile?.upgrades?.magnetDurationLevel || 1))}s</div>
                    {(stats.profile?.upgrades?.magnetDurationLevel || 1) < 5 ? (
                      (() => {
                        const level = stats.profile?.upgrades?.magnetDurationLevel || 1;
                        const cost = level * 100;
                        const canAfford = (stats.profile?.totalCoins || 0) >= cost;
                        return (
                          <button 
                            onClick={() => onBuyMagnet(cost)}
                            disabled={!canAfford}
                            className={`px-6 py-2 border text-xs uppercase tracking-widest rounded font-bold transition-colors ${canAfford ? 'bg-[#ffea00]/20 text-[#ffea00] border-[#ffea00]/50 hover:bg-[#ffea00]/40 cursor-pointer' : 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed'}`}
                          >
                            Upgrade ({cost})
                          </button>
                        );
                      })()
                    ) : (
                      <div className="px-6 py-2 bg-white/10 text-white/50 text-xs uppercase tracking-widest rounded font-bold">MAX LEVEL</div>
                    )}
                  </div>
                </div>

                {/* Shield Consumable */}
                <div className="flex flex-col p-6 rounded-xl border bg-black/40 border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col z-10">
                      <span className="text-purple-400 font-bold text-lg tracking-wide drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">Energy Shield</span>
                      <span className="text-white/50 text-xs mt-1">Survive one fatal collision.</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 z-10">
                    <div className="text-purple-300 text-sm">{stats.profile?.upgrades?.shieldOwned ? '1x Ready for deployment' : 'Single-use consumable'}</div>
                    {stats.profile?.upgrades?.shieldOwned ? (
                      <div className="px-6 py-2 bg-purple-500/20 border border-purple-500/50 text-purple-400 text-xs uppercase tracking-widest rounded font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)]">OWNED</div>
                    ) : (
                      (() => {
                        const canAfford = (stats.profile?.totalCoins || 0) >= 200;
                        return (
                          <button 
                            onClick={() => onBuyShield(200)}
                            disabled={!canAfford}
                            className={`px-6 py-2 border text-xs uppercase tracking-widest rounded font-bold transition-colors ${canAfford ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 hover:bg-purple-500/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] cursor-pointer' : 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed'}`}
                          >
                            Buy (200)
                          </button>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button onClick={onCloseShop} className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest rounded-xl transition-colors cursor-pointer border border-white/10">
                Return to Base
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decorative Border */}
      <div className="absolute inset-0 pointer-events-none border-[12px] md:border-[24px] border-black/20 z-0 mix-blend-overlay"></div>
    </div>
  );
}
