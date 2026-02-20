import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

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
    const { data: ventureRow } = await supabase
      .from("player_resources")
      .select("amount")
      .eq("resource_type", "venture_level")
      .single();

    const currentLevel = ventureRow?.amount || 1;

    // Find the next upgrade
    const nextUpgrade = UPGRADE_COSTS.find(u => u.level === currentLevel + 1);
    if (!nextUpgrade) {
      return NextResponse.json({ error: "Already at max level!", maxed: true }, { status: 400 });
    }

    // Check capital
    const { data: capitalRow } = await supabase
      .from("player_resources")
      .select("amount")
      .eq("resource_type", "capital")
      .single();

    const capital = capitalRow?.amount || 0;

    if (capital < nextUpgrade.cost) {
      return NextResponse.json({
        error: `Need ${nextUpgrade.cost} Capital (you have ${capital})`,
        needed: nextUpgrade.cost,
        have: capital,
      }, { status: 400 });
    }

    // Spend capital
    await supabase.rpc("increment_resource_amount", {
      p_resource_type: "capital",
      p_delta: -nextUpgrade.cost,
    });

    // Level up
    if (ventureRow) {
      await supabase
        .from("player_resources")
        .update({ amount: nextUpgrade.level })
        .eq("resource_type", "venture_level");
    } else {
      await supabase.from("player_resources").insert({
        id: crypto.randomUUID(),
        player_id: "default_player",
        resource_type: "venture_level",
        amount: nextUpgrade.level,
      });
    }

    const { data: newCapital } = await supabase
      .from("player_resources")
      .select("amount")
      .eq("resource_type", "capital")
      .single();

    return NextResponse.json({
      success: true,
      newLevel: nextUpgrade.level,
      newName: nextUpgrade.name,
      capitalSpent: nextUpgrade.cost,
      capitalRemaining: newCapital?.amount || 0,
    });

  } catch (error) {
    console.error("Upgrade error:", error);
    return NextResponse.json({ error: "Failed to upgrade" }, { status: 500 });
  }
}
