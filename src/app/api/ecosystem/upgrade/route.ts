import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Venture upgrade tiers: spend Capital to level up
const UPGRADE_COSTS = [
  { level: 2, cost: 500,  name: "The Strip Mall Office" },
  { level: 3, cost: 1500, name: "The Accelerator" },
  { level: 4, cost: 3000, name: "The Corporate Campus" },
  { level: 5, cost: 5000, name: "The Skyscraper" },
];

export async function POST(req: NextRequest) {
  try {
    // Get current venture level
    const ventureRow = db.prepare(
      "SELECT amount FROM player_resources WHERE resource_type = 'venture_level'"
    ).get() as { amount: number } | undefined;

    const currentLevel = ventureRow?.amount || 1;

    // Find the next upgrade
    const nextUpgrade = UPGRADE_COSTS.find(u => u.level === currentLevel + 1);
    if (!nextUpgrade) {
      return NextResponse.json({ error: "Already at max level!", maxed: true }, { status: 400 });
    }

    // Check capital
    const capitalRow = db.prepare(
      "SELECT amount FROM player_resources WHERE resource_type = 'capital'"
    ).get() as { amount: number } | undefined;

    const capital = capitalRow?.amount || 0;

    if (capital < nextUpgrade.cost) {
      return NextResponse.json({ 
        error: `Need ${nextUpgrade.cost} Capital (you have ${capital})`,
        needed: nextUpgrade.cost,
        have: capital 
      }, { status: 400 });
    }

    // Spend capital and level up
    db.transaction(() => {
      db.prepare(
        "UPDATE player_resources SET amount = amount - ? WHERE resource_type = 'capital'"
      ).run(nextUpgrade.cost);

      if (ventureRow) {
        db.prepare(
          "UPDATE player_resources SET amount = ? WHERE resource_type = 'venture_level'"
        ).run(nextUpgrade.level);
      } else {
        db.prepare(
          "INSERT INTO player_resources (id, player_id, resource_type, amount) VALUES (?, ?, ?, ?)"
        ).run(crypto.randomUUID(), 'default_player', 'venture_level', nextUpgrade.level);
      }
    })();

    const newCapital = db.prepare(
      "SELECT amount FROM player_resources WHERE resource_type = 'capital'"
    ).get() as { amount: number };

    return NextResponse.json({ 
      success: true,
      newLevel: nextUpgrade.level,
      newName: nextUpgrade.name,
      capitalSpent: nextUpgrade.cost,
      capitalRemaining: newCapital.amount
    });

  } catch (error) {
    console.error("Upgrade error:", error);
    return NextResponse.json({ error: "Failed to upgrade" }, { status: 500 });
  }
}
