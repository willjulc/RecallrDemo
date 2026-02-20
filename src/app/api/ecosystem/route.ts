import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface ConceptRow {
  id: string;
  name: string;
  topic: string;
  description: string;
  bloom_mastery: number;
  mastery_score: number;
  last_reviewed: string | null;
  review_count: number;
}

// Building types mapped to Bloom's mastery level
const BUILDING_TIERS: Record<number, { name: string; emoji: string }> = {
  0: { name: "Empty Plot", emoji: "🌱" },
  1: { name: "Cottage", emoji: "🏠" },
  2: { name: "Workshop", emoji: "🏗️" },
  3: { name: "Academy", emoji: "🏛️" },
  4: { name: "Tower", emoji: "🏰" },
  5: { name: "Citadel", emoji: "⛩️" },
};

// Topic → visual theme
const TOPIC_THEMES: Record<string, { color: string; groundEmoji: string; accent: string }> = {
  default:    { color: "#22c55e", groundEmoji: "🌿", accent: "#16a34a" },
  accounting: { color: "#3b82f6", groundEmoji: "📊", accent: "#2563eb" },
  finance:    { color: "#f59e0b", groundEmoji: "💰", accent: "#d97706" },
  management: { color: "#8b5cf6", groundEmoji: "📋", accent: "#7c3aed" },
  economics:  { color: "#ef4444", groundEmoji: "📈", accent: "#dc2626" },
  operations: { color: "#06b6d4", groundEmoji: "⚙️", accent: "#0891b2" },
  marketing:  { color: "#ec4899", groundEmoji: "📢", accent: "#db2777" },
  strategy:   { color: "#f97316", groundEmoji: "🎯", accent: "#ea580c" },
};

function getTopicTheme(topic: string) {
  const key = topic.toLowerCase();
  for (const [k, v] of Object.entries(TOPIC_THEMES)) {
    if (key.includes(k)) return v;
  }
  return TOPIC_THEMES.default;
}

function getDecayLevel(lastReviewed: string | null): "healthy" | "warning" | "critical" {
  if (!lastReviewed) return "warning";
  const hoursSince = (Date.now() - new Date(lastReviewed).getTime()) / (1000 * 60 * 60);
  if (hoursSince > 48) return "critical";
  if (hoursSince > 24) return "warning";
  return "healthy";
}

export async function GET() {
  try {
    const concepts = db.prepare("SELECT * FROM concepts ORDER BY topic, mastery_score DESC")
      .all() as ConceptRow[];

    // Calculate total resources from XP
    const xpResult = db.prepare(
      "SELECT COALESCE(SUM(xp_earned), 0) as total_xp FROM user_interactions"
    ).get() as { total_xp: number };

    const totalInteractions = db.prepare(
      "SELECT COUNT(*) as count FROM user_interactions"
    ).get() as { count: number };

    // Build the ecosystem state
    const buildings = concepts.map((concept, index) => {
      const theme = getTopicTheme(concept.topic);
      const tier = BUILDING_TIERS[concept.bloom_mastery] || BUILDING_TIERS[0];
      const decay = getDecayLevel(concept.last_reviewed);

      return {
        id: concept.id,
        name: concept.name,
        topic: concept.topic,
        description: concept.description,
        
        // Building state
        tier: concept.bloom_mastery,
        tierName: tier.name,
        tierEmoji: tier.emoji,
        
        // Health (mapped from mastery)
        health: Math.round(concept.mastery_score * 100),
        decay,
        
        // Visual theme
        color: theme.color,
        accent: theme.accent,
        groundEmoji: theme.groundEmoji,
        
        // Grid position (arrange in a roughly isometric grid)
        gridX: index % 4,
        gridY: Math.floor(index / 4),
        
        // Stats
        reviewCount: concept.review_count,
        bloomLevel: concept.bloom_mastery,
      };
    });

    // Fill empty plots to complete a 4x4 grid
    const gridSize = Math.max(16, Math.ceil(buildings.length / 4) * 4);
    while (buildings.length < gridSize && buildings.length < 16) {
      buildings.push({
        id: `empty-${buildings.length}`,
        name: "Undiscovered",
        topic: "Unknown",
        description: "Study more to discover new concepts",
        tier: 0,
        tierName: "Empty Plot",
        tierEmoji: "🌱",
        health: 0,
        decay: "healthy" as const,
        color: "#94a3b8",
        accent: "#64748b",
        groundEmoji: "🌿",
        gridX: buildings.length % 4,
        gridY: Math.floor(buildings.length / 4),
        reviewCount: 0,
        bloomLevel: 0,
      });
    }

    // Get coin balance
    const resources = db.prepare("SELECT * FROM player_resources WHERE id = 1")
      .get() as { coins: number; total_coins_earned: number; total_coins_spent: number } | undefined;

    return NextResponse.json({
      buildings,
      stats: {
        totalXP: xpResult.total_xp,
        totalConcepts: concepts.length,
        averageMastery: concepts.length > 0 
          ? Math.round(concepts.reduce((sum, c) => sum + c.mastery_score, 0) / concepts.length * 100) 
          : 0,
        totalInteractions: totalInteractions.count,
        conceptsAtRisk: concepts.filter(c => getDecayLevel(c.last_reviewed) !== "healthy").length,
        coins: resources?.coins || 0,
        totalCoinsEarned: resources?.total_coins_earned || 0,
      }
    });

  } catch (error) {
    console.error("Ecosystem API error:", error);
    return NextResponse.json({ error: "Failed to load ecosystem" }, { status: 500 });
  }
}
