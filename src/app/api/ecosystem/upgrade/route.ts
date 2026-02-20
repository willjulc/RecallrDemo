import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST: Spend coins to boost a building
export async function POST(req: NextRequest) {
  try {
    const { conceptId, cost } = await req.json();

    if (!conceptId || !cost) {
      return NextResponse.json({ error: "Missing conceptId or cost" }, { status: 400 });
    }

    // Check player has enough coins
    const resources = db.prepare("SELECT coins FROM player_resources WHERE id = 1")
      .get() as { coins: number } | undefined;
    
    if (!resources || resources.coins < cost) {
      return NextResponse.json({ error: "Not enough coins", coins: resources?.coins || 0 }, { status: 400 });
    }

    // Spend coins and boost mastery
    const concept = db.prepare("SELECT * FROM concepts WHERE id = ?").get(conceptId) as {
      bloom_mastery: number;
      mastery_score: number;
    } | undefined;

    if (!concept) {
      return NextResponse.json({ error: "Concept not found" }, { status: 404 });
    }

    // Boost mastery score by 0.15 and potentially upgrade Bloom's level
    let newMastery = Math.min(1, concept.mastery_score + 0.15);
    let newBloom = concept.bloom_mastery;
    
    if (newMastery > 0.7 && newBloom < 5) {
      newBloom = Math.min(5, newBloom + 1);
    }

    db.prepare("UPDATE concepts SET mastery_score = ?, bloom_mastery = ? WHERE id = ?")
      .run(newMastery, newBloom, conceptId);
    
    db.prepare("UPDATE player_resources SET coins = coins - ?, total_coins_spent = total_coins_spent + ? WHERE id = 1")
      .run(cost, cost);

    const updatedResources = db.prepare("SELECT * FROM player_resources WHERE id = 1").get() as { coins: number };

    return NextResponse.json({ 
      success: true, 
      coins: updatedResources.coins,
      newMastery: Math.round(newMastery * 100),
      newBloom 
    });

  } catch (error) {
    console.error("Upgrade error:", error);
    return NextResponse.json({ error: "Failed to upgrade" }, { status: 500 });
  }
}
