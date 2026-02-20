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

const BLOOM_LABELS = ["—", "Remember", "Understand", "Apply", "Analyze", "Evaluate"];

export function EcosystemView() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [stats, setStats] = useState<EcosystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

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

  if (!stats || stats.totalConcepts === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="surface p-12 text-center max-w-md">
          <div className="text-6xl mb-4">🏗️</div>
          <h2 className="font-display text-2xl font-bold text-text-primary mb-2">Your City Awaits</h2>
          <p className="text-text-secondary font-semibold mb-6">
            Complete study sessions to discover concepts and build your knowledge city!
          </p>
          <a href="/study/library" className="btn-bounce btn-primary-3d text-lg px-8 py-4 inline-flex">
            📚 Start Studying
          </a>
        </div>
      </div>
    );
  }

  const selectedBuilding = selected ? buildings.find(b => b.id === selected) : null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* ── STATS BAR ── */}
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
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">XP</div>
          </div>
        </div>
        <div className="stat-card px-5 py-3 flex items-center gap-2">
          <span className="text-xl">📊</span>
          <div>
            <div className="font-display text-xl font-bold text-green-600">{stats.averageMastery}%</div>
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Mastery</div>
          </div>
        </div>
        {stats.conceptsAtRisk > 0 && (
          <div className="stat-card px-5 py-3 flex items-center gap-2" style={{ borderColor: '#ffc5bf' }}>
            <span className="text-xl">⚠️</span>
            <div>
              <div className="font-display text-xl font-bold text-coral-500">{stats.conceptsAtRisk}</div>
              <div className="text-[10px] font-bold text-coral-400 uppercase tracking-wider">At Risk</div>
            </div>
          </div>
        )}
      </div>

      {/* ── BUILDING CARD GRID ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {buildings.map((b) => {
          const isEmpty = b.tier === 0;
          const isCritical = b.decay === "critical";
          const isWarning = b.decay === "warning";
          const isActive = selected === b.id;

          return (
            <button
              key={b.id}
              onClick={() => setSelected(isActive ? null : b.id)}
              className={`
                relative rounded-2xl p-4 text-center transition-all duration-200
                border-2 focus:outline-none cursor-pointer
                ${isActive
                  ? 'scale-[1.03] ring-2 ring-offset-2'
                  : 'hover:scale-[1.02]'
                }
                ${isCritical
                  ? 'animate-pulse'
                  : ''
                }
              `}
              style={{
                background: isEmpty
                  ? '#f8fafc'
                  : `linear-gradient(145deg, ${b.color}08, ${b.color}15)`,
                borderColor: isActive
                  ? b.color
                  : isEmpty
                    ? '#e2e8f0'
                    : isCritical
                      ? '#ff4b35'
                      : isWarning
                        ? '#fbbf24'
                        : `${b.color}40`,
                boxShadow: isActive
                  ? `0 0 0 2px ${b.color}, 0 6px 0 ${b.color}40`
                  : isCritical
                    ? '0 0 12px rgba(255,75,53,0.2), 0 4px 0 #ffc5bf'
                    : `0 4px 0 ${isEmpty ? '#e2e8f0' : b.color + '25'}`,
                // @ts-expect-error CSS custom property
                '--tw-ring-color': b.color,
              }}
            >
              {/* Bloom level badge */}
              {!isEmpty && b.bloomLevel > 1 && (
                <div
                  className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white z-10"
                  style={{ background: b.color, boxShadow: `0 2px 0 ${b.accent}` }}
                >
                  L{b.bloomLevel}
                </div>
              )}

              {/* Decay badge */}
              {!isEmpty && b.decay !== "healthy" && (
                <div className="absolute -top-2 -right-2 z-10 text-lg">
                  {isCritical ? "🔥" : "⚡"}
                </div>
              )}

              {/* Building emoji */}
              <div
                className="text-4xl mb-2"
                style={{
                  filter: isCritical ? "saturate(0.5) brightness(0.8)" : undefined,
                  animation: !isEmpty && b.decay === "healthy" ? "bob 3s ease-in-out infinite" : undefined,
                  animationDelay: `${b.gridX * 0.2 + b.gridY * 0.3}s`,
                }}
              >
                {b.tierEmoji}
              </div>

              {/* Name */}
              <div
                className="text-xs font-bold leading-tight mb-2 line-clamp-2 min-h-[2rem]"
                style={{ color: isEmpty ? "#94a3b8" : b.accent }}
              >
                {b.name}
              </div>

              {/* Health bar */}
              {!isEmpty && (
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#e2e8f0" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${b.health}%`,
                      background: b.health > 60
                        ? `linear-gradient(90deg, ${b.color}, ${b.accent})`
                        : b.health > 30
                          ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                          : "linear-gradient(90deg, #ff4b35, #ff6b5b)",
                    }}
                  />
                </div>
              )}

              {/* Tier label */}
              <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-1.5">
                {b.tierName}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── SELECTED BUILDING DETAIL ── */}
      {selectedBuilding && !selectedBuilding.id.startsWith("empty") && (
        <div className="mt-6 animate-slide-in">
          <div
            className="surface"
            style={{ borderColor: selectedBuilding.color + "60" }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{
                    background: selectedBuilding.color + "20",
                    boxShadow: `0 4px 0 ${selectedBuilding.color}30`,
                  }}
                >
                  {selectedBuilding.tierEmoji}
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-text-primary">{selectedBuilding.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="chip chip-navy text-[10px]">{selectedBuilding.topic}</span>
                    <span className="chip text-[10px]" style={{ background: selectedBuilding.color + "20", color: selectedBuilding.accent }}>
                      {selectedBuilding.tierName}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary font-bold p-1">✕</button>
            </div>

            <p className="text-sm text-text-secondary font-semibold mb-4">{selectedBuilding.description}</p>

            {/* Health bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-text-muted uppercase tracking-wider">Health</span>
                <span style={{ color: selectedBuilding.color }}>{selectedBuilding.health}%</span>
              </div>
              <div className="progress-track">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${selectedBuilding.health}%`,
                    background: `linear-gradient(90deg, ${selectedBuilding.color}, ${selectedBuilding.accent})`,
                  }}
                />
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-navy-50 rounded-xl p-3 text-center">
                <div className="font-display text-lg font-bold" style={{ color: selectedBuilding.color }}>L{selectedBuilding.bloomLevel}</div>
                <div className="text-[10px] font-bold text-text-muted uppercase">{BLOOM_LABELS[selectedBuilding.bloomLevel]}</div>
              </div>
              <div className="bg-navy-50 rounded-xl p-3 text-center">
                <div className="font-display text-lg font-bold text-text-primary">{selectedBuilding.reviewCount}</div>
                <div className="text-[10px] font-bold text-text-muted uppercase">Reviews</div>
              </div>
              <div className="bg-navy-50 rounded-xl p-3 text-center">
                <div className="text-lg">
                  {selectedBuilding.decay === "healthy" ? "✅" : selectedBuilding.decay === "warning" ? "⚡" : "🔥"}
                </div>
                <div className="text-[10px] font-bold text-text-muted uppercase">
                  {selectedBuilding.decay === "healthy" ? "Healthy" : selectedBuilding.decay === "warning" ? "Review" : "Decaying"}
                </div>
              </div>
            </div>

            {/* Decay warning */}
            {selectedBuilding.decay !== "healthy" && (
              <div className={`rounded-xl p-4 flex items-center gap-3 mb-4 ${
                selectedBuilding.decay === "critical" ? "bg-coral-50 border-2 border-coral-200" : "bg-gold-50 border-2 border-gold-300"
              }`}>
                <span className="text-2xl">{selectedBuilding.decay === "critical" ? "🏚️" : "⚡"}</span>
                <div className="flex-1">
                  <div className={`font-bold text-sm ${selectedBuilding.decay === "critical" ? "text-coral-600" : "text-gold-500"}`}>
                    {selectedBuilding.decay === "critical" ? "This building is crumbling!" : "Needs maintenance"}
                  </div>
                  <div className="text-xs font-semibold text-text-muted">
                    Review &quot;{selectedBuilding.name}&quot; to restore it.
                  </div>
                </div>
              </div>
            )}

            <a href="/study/library" className="btn-bounce btn-primary-3d w-full py-3 text-center inline-flex justify-center">
              {selectedBuilding.decay !== "healthy" ? "🔧 Repair This Building" : "📚 Study to Upgrade"}
            </a>
          </div>
        </div>
      )}

      {/* ── LEGEND ── */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {[
          { emoji: "🌱", label: "Empty" },
          { emoji: "🏠", label: "Cottage" },
          { emoji: "🏗️", label: "Workshop" },
          { emoji: "🏛️", label: "Academy" },
          { emoji: "🏰", label: "Tower" },
          { emoji: "⛩️", label: "Citadel" },
        ].map(({ emoji, label }) => (
          <span key={label} className="chip chip-navy text-[10px] font-bold">
            {emoji} {label}
          </span>
        ))}
      </div>
    </div>
  );
}
