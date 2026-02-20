"use client";

import { useState, useEffect, useCallback } from "react";

interface Concept {
  id: string;
  name: string;
  topic: string;
  description: string;
  tier: number;
  tierName: string;
  health: number;
  decay: "healthy" | "warning" | "critical";
  reviewCount: number;
  bloomLevel: number;
}

interface VentureStats {
  totalXP: number;
  totalConcepts: number;
  averageMastery: number;
  totalInteractions: number;
  conceptsAtRisk: number;
  capital: number;
  ventureLevel: number;
}

const BLOOM_LABELS = ["—", "Remember", "Understand", "Apply", "Analyze", "Evaluate"];

const VENTURE_LEVELS = [
  { level: 1, name: "The Garage", emoji: "🚙", description: "A scrappy beginning. Study and earn Capital to upgrade.", upgradeCost: 500 },
  { level: 2, name: "The Strip Mall Office", emoji: "🏢", description: "A real address. Things are picking up.", upgradeCost: 1500 },
  { level: 3, name: "The Accelerator", emoji: "🚀", description: "You're backed. Growth is accelerating.", upgradeCost: 3000 },
  { level: 4, name: "The Corporate Campus", emoji: "🏙️", description: "Industry presence. You're a serious player.", upgradeCost: 5000 },
  { level: 5, name: "The Skyscraper", emoji: "🏗️", description: "You've mastered the curriculum. Top of the world.", upgradeCost: null },
];

function getVentureState(level: number) {
  return VENTURE_LEVELS[Math.min(level, 5) - 1] || VENTURE_LEVELS[0];
}

export function VentureDashboard() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [stats, setStats] = useState<VentureStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeFlash, setUpgradeFlash] = useState(false);

  const fetchEcosystem = useCallback(() => {
    fetch("/api/ecosystem")
      .then(res => res.json())
      .then(data => {
        // Filter out the empty plots from the old ecosystem view
        const validConcepts = (data.buildings || []).filter((b: any) => !b.id.startsWith("empty"));
        setConcepts(validConcepts);
        setStats(data.stats || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchEcosystem(); }, [fetchEcosystem]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="surface p-12 text-center">
          <div className="mascot mb-4 animate-bounce">📈</div>
          <h2 className="type-display text-3xl">Loading Your Venture...</h2>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalConcepts === 0) {
    return (
      <div className="flex items-center justify-center p-12 mt-12">
        <div className="surface p-12 text-center max-w-md">
          <div className="text-6xl mb-4 text-[var(--text-primary)]">🏭</div>
          <h2 className="type-display text-3xl mb-4">Your Venture Awaits</h2>
          <p className="type-body text-sm mb-8 leading-relaxed">
            Complete study sessions to grow your virtual venture. Your mastery builds this world.
          </p>
          <a href="/study/library" className="btn btn-primary btn-lg justify-center w-full">
            📚 Start Studying
          </a>
        </div>
      </div>
    );
  }

  const capital = stats.capital || 0;
  const ventureState = getVentureState(stats.ventureLevel || 1);
  const nextLevel = VENTURE_LEVELS.find(v => v.level === ventureState.level + 1);
  const upgradeCost = ventureState.upgradeCost; // Cost to leave current level
  const canUpgrade = upgradeCost !== null && nextLevel && capital >= upgradeCost;
  
  const handleUpgrade = async () => {
    if (!canUpgrade || upgrading) return;
    setUpgrading(true);
    try {
      const res = await fetch('/api/ecosystem/upgrade', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setUpgradeFlash(true);
        setTimeout(() => setUpgradeFlash(false), 2000);
        fetchEcosystem(); // Refresh data
      } else {
        console.error('Upgrade failed:', data.error);
      }
    } catch (e) {
      console.error('Upgrade error:', e);
    } finally {
      setUpgrading(false);
    }
  };
  
  const crises = concepts.filter(c => c.decay !== "healthy");
  const healthyConcepts = concepts.filter(c => c.decay === "healthy");

  return (
    <div className="w-full max-w-5xl mx-auto pb-16 mt-8">
      
      {/* ── VENTURE STATUS BANNER ── */}
      <div className="surface mb-8 p-8 relative overflow-hidden bg-[var(--color-surface-sunken)] border-[var(--violet-500)] border-l-[4px]">
        {/* Background visual based on level */}
        <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] text-[240px] pointer-events-none grayscale">
          {ventureState.emoji}
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <span className="text-5xl drop-shadow-sm">{ventureState.emoji}</span>
              <div>
                <h1 className="type-display m-0 p-0 leading-none">
                  {ventureState.name}
                </h1>
                <span className="chip chip-ink mt-3 inline-block font-bold">Venture Level {ventureState.level}</span>
              </div>
            </div>
            <p className="type-body text-sm mt-3 max-w-md leading-relaxed">
              {ventureState.description}
            </p>
          </div>
          
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-[var(--r-xl)] text-center min-w-[200px] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[var(--amber-500)] to-[var(--rose-500)]"></div>
            <div className="type-mono text-[11px] text-[var(--amber-400)] tracking-wider mb-2 uppercase font-bold">Total Capital</div>
            <div className="type-display text-5xl text-[var(--amber-500)] pb-3 mb-3 border-b border-[var(--color-border)]">
              {capital}
            </div>
            
            {nextLevel && upgradeCost !== null ? (
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="type-mono text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider">Next: {nextLevel.name}</span>
                  <span className="type-mono text-[9px] text-[var(--amber-400)] font-bold">{capital}/{upgradeCost}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--color-surface-sunken)] mb-3 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-[var(--amber-500)] to-[var(--amber-400)] transition-all duration-500"
                    style={{ width: `${Math.min(100, (capital / upgradeCost) * 100)}%` }}
                  />
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={!canUpgrade || upgrading}
                  className={`btn w-full justify-center text-xs py-2 font-bold uppercase tracking-wider transition-all ${
                    canUpgrade 
                      ? 'btn-primary animate-pulse hover:animate-none' 
                      : 'btn-secondary opacity-50 cursor-not-allowed'
                  }`}
                >
                  {upgrading ? '🔄 Upgrading...' : canUpgrade ? `⬆️ Upgrade — ${upgradeCost} Capital` : `🔒 Need ${upgradeCost} Capital`}
                </button>
              </div>
            ) : (
              <div className="type-mono text-[10px] text-[var(--lime-400)] uppercase font-bold tracking-widest flex items-center gap-1">
                🏆 Max Level Reached
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ── LEFT COLUMN: DASHBOARD & CRISES ── */}
        <div className="md:col-span-2 flex flex-col gap-6">
          
          {/* Stats Bar */}
          <div className="ds-row gap-4 w-full" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card p-4">
              <div className="stat-value">{stats.totalConcepts}</div>
              <div className="stat-label">Total Assets</div>
            </div>
            <div className="stat-card p-4">
              <div className="stat-value text-[var(--lime-500)]">{stats.averageMastery}%</div>
              <div className="stat-label">Avg Efficiency</div>
            </div>
            <div className="stat-card p-4">
              <div className="stat-value text-[var(--violet-400)]">{stats.totalXP}</div>
              <div className="stat-label">XP Earned</div>
            </div>
            <div className={`stat-card p-4 ${stats.conceptsAtRisk > 0 ? 'bg-[var(--chip-rose-bg)] border-[var(--rose-500)]' : ''}`}>
              <div className={`stat-value ${stats.conceptsAtRisk > 0 ? 'text-[var(--rose-600)]' : 'text-[var(--color-text-primary)]'}`}>{stats.conceptsAtRisk}</div>
              <div className="stat-label">Active Crises</div>
            </div>
          </div>

          {/* Operational Crises (Spaced Repetition Decay) */}
          <div className="surface p-6">
            <h3 className="type-heading-lg flex items-center gap-2 mb-2">
              🚨 Operational Crises
            </h3>
            <p className="type-body text-sm font-semibold mb-6">
              These concepts need review. Study them now to prevent Capital loss.
            </p>
            
            {crises.length === 0 ? (
              <div className="toast toast-success w-full max-w-none justify-center">
                 <div className="toast-icon bg-[var(--chip-lime-bg)] text-[var(--lime-600)]">▲</div>
                 <div>
                     <div className="toast-title">All Concepts Healthy</div>
                     <div className="toast-body">No pending reviews. Your mastery is strong.</div>
                 </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {crises.map(crisis => (
                  <div key={crisis.id} className={`p-5 rounded-[var(--r-xl)] border-2 flex flex-col sm:flex-row sm:items-center gap-4 justify-between animate-fade-in-up transition-all ${
                    crisis.decay === "critical" ? "bg-[var(--chip-rose-bg)] border-[var(--rose-500)] shadow-[0_0_15px_rgba(244,63,94,0.1)]" : "bg-[var(--chip-amber-bg)] border-[var(--amber-400)]"
                  }`}>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl drop-shadow-sm">{crisis.decay === 'critical' ? '🔥' : '⚡'}</span>
                            <h4 className={`type-heading-md leading-none ${crisis.decay === 'critical' ? 'text-[var(--rose-600)]' : 'text-[var(--amber-600)]'}`}>
                                {crisis.decay === 'critical' ? 'Critical Failure:' : 'Warning:'} {crisis.name}
                            </h4>
                        </div>
                        <p className={`type-mono text-[10px] pl-9 uppercase font-bold tracking-wider ${crisis.decay === 'critical' ? 'text-[var(--rose-600)]' : 'text-[var(--amber-600)]'}`}>
                            Bloom Level: {crisis.bloomLevel} — {BLOOM_LABELS[crisis.bloomLevel]}
                        </p>
                    </div>
                    
                    <a 
                      href={`/study/library?concept=${crisis.id}&name=${encodeURIComponent(crisis.name)}`}
                      className={`btn px-6 py-3 text-sm flex-shrink-0 text-center uppercase tracking-widest font-bold ${
                          crisis.decay === 'critical' ? 'btn-primary' : 'btn-primary'
                      }`}
                      style={crisis.decay === 'critical' ? { background: 'linear-gradient(180deg, var(--rose-400), var(--rose-500))', boxShadow: '0 0 0 1.5px var(--rose-600), 0 5px 0 var(--rose-600)' } : {}}
                    >
                      Resolve Crisis
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: ASSET INVENTORY ── */}
        <div className="surface p-6 h-fit max-h-[700px] flex flex-col">
          <h3 className="type-heading-lg flex items-center gap-2 mb-2">
            📦 Asset Inventory
          </h3>
          <p className="type-body text-sm mb-6 pb-4 border-b border-[var(--color-border)]">
            Healthy concepts currently generating value for your venture.
          </p>

          <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {healthyConcepts.map(concept => (
                <div key={concept.id} className="bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-[var(--r-md)] p-4 flex items-center justify-between transition-colors hover:border-[var(--color-primary)]">
                    <div className="min-w-0 pr-3">
                        <div className="type-label font-bold truncate mb-1">{concept.name}</div>
                        <div className="type-mono text-[10px] text-[var(--color-text-muted)] flex items-center gap-2 uppercase font-bold tracking-wider">
                           Lvl {concept.bloomLevel} <span className="w-1 h-1 bg-[var(--color-border)] rounded-full" /> {concept.health}% Health
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[var(--chip-lime-bg)] border border-[var(--lime-500)] shadow-[0_0_10px_rgba(132,204,22,0.2)] text-[var(--lime-500)] flex items-center justify-center font-bold text-xs flex-shrink-0">
                        ✓
                    </div>
                </div>
            ))}
            {healthyConcepts.length === 0 && (
                <div className="text-center p-6 bg-[var(--color-surface-sunken)] rounded-[var(--r-md)] border border-dashed border-[var(--color-border)] mt-2">
                    <div className="text-3xl mb-3 opacity-50">🌱</div>
                    <p className="type-body text-sm text-[var(--color-text-muted)]">No healthy assets yet. Answer questions correctly to build them.</p>
                </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
