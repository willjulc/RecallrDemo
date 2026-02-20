"use client";

import { useState, useEffect } from "react";

interface Building {
  id: string;
  name: string;
  topic: string;
  description: string;
  tier: number;
  tierName: string;
  tierEmoji: string;
  health: number;
  decay: "healthy" | "warning" | "critical";
  color: string;
  accent: string;
  groundEmoji: string;
  gridX: number;
  gridY: number;
  reviewCount: number;
  bloomLevel: number;
}

interface EcosystemStats {
  totalXP: number;
  totalConcepts: number;
  averageMastery: number;
  totalInteractions: number;
  conceptsAtRisk: number;
}

interface SelectedBuilding extends Building {}

export function EcosystemView() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [stats, setStats] = useState<EcosystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedBuilding | null>(null);

  useEffect(() => {
    fetch("/api/ecosystem")
      .then(res => res.json())
      .then(data => {
        setBuildings(data.buildings || []);
        setStats(data.stats || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="surface p-12 text-center">
          <div className="mascot mb-4">🏰</div>
          <h2 className="font-display text-2xl font-bold text-text-primary">Loading Your City...</h2>
        </div>
      </div>
    );
  }

  if (buildings.length === 0 || (stats && stats.totalConcepts === 0)) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="surface p-12 text-center max-w-md">
          <div className="text-6xl mb-4">🏗️</div>
          <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
            Your City Awaits
          </h2>
          <p className="text-text-secondary font-semibold mb-6">
            Complete study sessions to discover concepts and build your knowledge city. Each concept you master becomes a building!
          </p>
          <a href="/study/library" className="btn-bounce btn-primary-3d text-lg px-8 py-4 inline-flex">
            📚 Start Studying
          </a>
        </div>
      </div>
    );
  }

  const rows = Math.ceil(buildings.length / 4);

  return (
    <div className="w-full">
      {/* ── STATS BAR ── */}
      {stats && (
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <div className="stat-card px-5 py-3 flex items-center gap-2">
            <span className="text-xl">🏘️</span>
            <div>
              <div className="font-display text-xl font-bold text-text-primary">{stats.totalConcepts}</div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Buildings</div>
            </div>
          </div>
          <div className="stat-card px-5 py-3 flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <div>
              <div className="font-display text-xl font-bold text-gold-500">{stats.totalXP}</div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">XP Earned</div>
            </div>
          </div>
          <div className="stat-card px-5 py-3 flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <div className="font-display text-xl font-bold text-green-600">{stats.averageMastery}%</div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Avg Mastery</div>
            </div>
          </div>
          {stats.conceptsAtRisk > 0 && (
            <div className="stat-card px-5 py-3 flex items-center gap-2 border-coral-200" style={{ borderColor: '#ffc5bf' }}>
              <span className="text-xl">⚠️</span>
              <div>
                <div className="font-display text-xl font-bold text-coral-500">{stats.conceptsAtRisk}</div>
                <div className="text-[10px] font-bold text-coral-400 uppercase tracking-wider">At Risk</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ISOMETRIC CITY GRID ── */}
      <div className="flex justify-center">
        <div 
          className="relative"
          style={{
            transform: "perspective(800px) rotateX(35deg) rotateZ(-45deg) scale(0.85)",
            transformStyle: "preserve-3d",
          }}
        >
          {Array.from({ length: rows }, (_, rowIdx) => (
            <div key={rowIdx} className="flex">
              {buildings.slice(rowIdx * 4, rowIdx * 4 + 4).map((b) => (
                <IsometricTile
                  key={b.id}
                  building={b}
                  onClick={() => setSelected(b)}
                  isSelected={selected?.id === b.id}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── SELECTED BUILDING DETAIL PANEL ── */}
      {selected && (
        <div className="mt-8 max-w-lg mx-auto animate-slide-in">
          <BuildingDetail building={selected} onClose={() => setSelected(null)} />
        </div>
      )}

      {/* ── LEGEND ── */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {[
          { emoji: "🌱", label: "Undiscovered" },
          { emoji: "🏠", label: "Cottage (L1)" },
          { emoji: "🏗️", label: "Workshop (L2)" },
          { emoji: "🏛️", label: "Academy (L3)" },
          { emoji: "🏰", label: "Tower (L4)" },
          { emoji: "⛩️", label: "Citadel (L5)" },
        ].map(({ emoji, label }) => (
          <span key={label} className="chip chip-navy text-xs font-bold">
            {emoji} {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ISOMETRIC TILE
   Each tile is a diamond-shaped plot in the city
   ═══════════════════════════════════════════════ */
function IsometricTile({ building, onClick, isSelected }: {
  building: Building;
  onClick: () => void;
  isSelected: boolean;
}) {
  const isEmpty = building.tier === 0;
  const isDecaying = building.decay !== "healthy";
  const isCritical = building.decay === "critical";

  // Dynamic ground color based on health
  const groundHue = isEmpty ? "#e2e8f0" : building.color + "22";

  return (
    <button
      onClick={onClick}
      className="relative group focus:outline-none"
      style={{
        width: 140,
        height: 140,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Ground tile */}
      <div
        className="absolute inset-2 rounded-xl transition-all duration-300"
        style={{
          background: isEmpty
            ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 50%, #86efac 100%)"
            : `linear-gradient(135deg, ${building.color}15 0%, ${building.color}30 50%, ${building.color}15 100%)`,
          border: isSelected
            ? `3px solid ${building.color}`
            : isEmpty
              ? "2px solid #bbf7d0"
              : `2px solid ${building.color}40`,
          boxShadow: isSelected
            ? `0 0 20px ${building.color}50, 0 8px 0 ${building.color}30`
            : isCritical
              ? "0 0 15px rgba(255,75,53,0.3), 0 6px 0 rgba(255,75,53,0.2)"
              : `0 6px 0 ${isEmpty ? "#86efac" : building.color + "30"}`,
          transform: "translateZ(0px)",
        }}
      >
        {/* Grass texture dots */}
        {isEmpty && (
          <>
            <div className="absolute top-4 left-5 w-1.5 h-1.5 rounded-full bg-green-400 opacity-40" />
            <div className="absolute top-8 right-6 w-1 h-1 rounded-full bg-green-500 opacity-30" />
            <div className="absolute bottom-6 left-8 w-1 h-1 rounded-full bg-green-400 opacity-40" />
          </>
        )}

        {/* Building */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Decay warning glow */}
          {isCritical && (
            <div 
              className="absolute inset-0 rounded-xl animate-pulse-glow"
              style={{ 
                boxShadow: "inset 0 0 20px rgba(255,75,53,0.2)",
                borderRadius: "inherit",
              }} 
            />
          )}

          {/* Building emoji */}
          <div 
            className={`text-4xl transition-transform duration-300 ${
              !isEmpty ? 'group-hover:scale-110' : ''
            } ${isDecaying ? 'grayscale-[30%]' : ''}`}
            style={{
              filter: isCritical ? "saturate(0.5) brightness(0.8)" : undefined,
              animation: !isEmpty && !isDecaying ? "bob 3s ease-in-out infinite" : undefined,
              animationDelay: `${building.gridX * 0.2 + building.gridY * 0.3}s`,
            }}
          >
            {building.tierEmoji}
          </div>

          {/* Building name */}
          <div 
            className="text-[10px] font-bold mt-1 text-center px-2 leading-tight truncate max-w-[120px]"
            style={{ color: isEmpty ? "#94a3b8" : building.accent }}
          >
            {building.name}
          </div>

          {/* Health bar */}
          {!isEmpty && (
            <div className="w-16 h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "#e2e8f0" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${building.health}%`,
                  background: building.health > 60
                    ? "linear-gradient(90deg, #22c55e, #4ade80)"
                    : building.health > 30
                      ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                      : "linear-gradient(90deg, #ff4b35, #ff6b5b)",
                }}
              />
            </div>
          )}

          {/* Decay indicator */}
          {isDecaying && !isEmpty && (
            <div className="absolute -top-1 -right-1">
              <span className={`text-sm ${isCritical ? 'animate-bounce' : ''}`}>
                {isCritical ? "🔥" : "⚡"}
              </span>
            </div>
          )}

          {/* Bloom level badge */}
          {!isEmpty && building.bloomLevel > 1 && (
            <div 
              className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
              style={{ background: building.color, boxShadow: `0 2px 0 ${building.accent}` }}
            >
              {building.bloomLevel}
            </div>
          )}
        </div>

        {/* Thriving particles */}
        {!isEmpty && building.health > 80 && !isDecaying && (
          <>
            <div 
              className="absolute top-2 right-4 w-1 h-1 rounded-full opacity-60"
              style={{ background: building.color, animation: "float-particle-1 2s ease-in-out infinite" }}
            />
            <div
              className="absolute top-6 left-3 w-1 h-1 rounded-full opacity-40"
              style={{ background: building.color, animation: "float-particle-2 2.5s ease-in-out infinite 0.5s" }}
            />
          </>
        )}
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════
   BUILDING DETAIL PANEL
   Shows when clicking a building on the grid
   ═══════════════════════════════════════════════ */
function BuildingDetail({ building, onClose }: { building: Building; onClose: () => void }) {
  const isEmpty = building.tier === 0;
  const bloomLabels = ["—", "Remember", "Understand", "Apply", "Analyze", "Evaluate"];

  return (
    <div className="surface" style={{ borderColor: isEmpty ? undefined : building.color + "60" }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{
              background: isEmpty ? "#f1f5f9" : building.color + "20",
              boxShadow: isEmpty ? undefined : `0 4px 0 ${building.color}30`,
            }}
          >
            {building.tierEmoji}
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-text-primary">{building.name}</h3>
            <p className="text-sm font-semibold text-text-muted">{building.tierName} • {building.topic}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg font-bold p-1">✕</button>
      </div>

      {isEmpty ? (
        <div className="bg-navy-50 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-text-secondary">
            🌱 This plot is empty. Study more to discover new concepts and build here!
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-text-secondary font-semibold mb-4">{building.description}</p>

          {/* Health bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-text-muted uppercase tracking-wider">Building Health</span>
              <span style={{ color: building.color }}>{building.health}%</span>
            </div>
            <div className="progress-track">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${building.health}%`,
                  background: `linear-gradient(90deg, ${building.color}, ${building.accent})`,
                }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-navy-50 rounded-xl p-3 text-center">
              <div className="font-display text-lg font-bold" style={{ color: building.color }}>
                L{building.bloomLevel}
              </div>
              <div className="text-[10px] font-bold text-text-muted uppercase">{bloomLabels[building.bloomLevel]}</div>
            </div>
            <div className="bg-navy-50 rounded-xl p-3 text-center">
              <div className="font-display text-lg font-bold text-text-primary">{building.reviewCount}</div>
              <div className="text-[10px] font-bold text-text-muted uppercase">Reviews</div>
            </div>
            <div className="bg-navy-50 rounded-xl p-3 text-center">
              <div className="font-display text-lg font-bold">
                {building.decay === "healthy" ? "✅" : building.decay === "warning" ? "⚡" : "🔥"}
              </div>
              <div className="text-[10px] font-bold text-text-muted uppercase">
                {building.decay === "healthy" ? "Healthy" : building.decay === "warning" ? "Needs Review" : "Decaying!"}
              </div>
            </div>
          </div>

          {/* Decay warning */}
          {building.decay !== "healthy" && (
            <div className={`rounded-xl p-4 flex items-center gap-3 mb-4 ${
              building.decay === "critical" ? "bg-coral-50 border-2 border-coral-200" : "bg-gold-50 border-2 border-gold-300"
            }`}>
              <span className="text-2xl">{building.decay === "critical" ? "🏚️" : "⚡"}</span>
              <div>
                <div className={`font-bold text-sm ${building.decay === "critical" ? "text-coral-600" : "text-gold-500"}`}>
                  {building.decay === "critical"
                    ? "This building is crumbling!"
                    : "This building needs maintenance"}
                </div>
                <div className="text-xs font-semibold text-text-muted">
                  Review &quot;{building.name}&quot; in your next study session to restore it.
                </div>
              </div>
            </div>
          )}

          {/* Action */}
          <a
            href="/study/library"
            className="btn-bounce btn-primary-3d w-full py-3 text-center inline-flex justify-center"
          >
            {building.decay !== "healthy" ? "🔧 Repair This Building" : "📚 Study to Upgrade"}
          </a>
        </>
      )}
    </div>
  );
}
