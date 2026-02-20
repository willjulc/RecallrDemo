import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { seedDemoDatabase } from "@/lib/db";

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

// Topic visual theme
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
    // Ensure demo data exists
    await seedDemoDatabase();

    const { data: concepts } = await supabase
      .from("concepts")
      .select("*")
      .order("topic")
      .order("mastery_score", { ascending: false });

    const typedConcepts = (concepts || []) as ConceptRow[];

    // Calculate total XP
    const { data: xpResult } = await supabase
      .from("user_interactions")
      .select("xp_earned");
    const totalXP = (xpResult || []).reduce((sum, r) => sum + (r.xp_earned || 0), 0);

    const totalInteractions = (xpResult || []).length;

    // Build the ecosystem state
    const buildings = typedConcepts.map((concept, index) => {
      const theme = getTopicTheme(concept.topic);
      const tier = BUILDING_TIERS[concept.bloom_mastery] || BUILDING_TIERS[0];
      const decay = getDecayLevel(concept.last_reviewed);

      return {
        id: concept.id,
        name: concept.name,
        topic: concept.topic,
        description: concept.description,
        tier: concept.bloom_mastery,
        tierName: tier.name,
        tierEmoji: tier.emoji,
        health: Math.round(concept.mastery_score * 100),
        decay,
        color: theme.color,
        accent: theme.accent,
        groundEmoji: theme.groundEmoji,
        gridX: index % 4,
        gridY: Math.floor(index / 4),
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

    // Get Capital balance
    const { data: capitalResource } = await supabase
      .from("player_resources")
      .select("amount")
      .eq("resource_type", "capital")
      .single();
    const capital = capitalResource?.amount || 0;

    // Get Venture Level
    const { data: ventureLevelRow } = await supabase
      .from("player_resources")
      .select("amount")
      .eq("resource_type", "venture_level")
      .single();
    const ventureLevel = ventureLevelRow?.amount || 1;

    return NextResponse.json({
      buildings,
      stats: {
        totalXP,
        totalConcepts: typedConcepts.length,
        averageMastery: typedConcepts.length > 0
          ? Math.round(typedConcepts.reduce((sum, c) => sum + c.mastery_score, 0) / typedConcepts.length * 100)
          : 0,
        totalInteractions,
        conceptsAtRisk: typedConcepts.filter(c => getDecayLevel(c.last_reviewed) !== "healthy").length,
        capital,
        ventureLevel,
      },
    });

  } catch (error) {
    console.error("Ecosystem API error:", error);
    return NextResponse.json({ error: "Failed to load ecosystem" }, { status: 500 });
  }
}
