// Seed script to initialize roulette configuration
import { db } from "./db";
import { rouletteConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedRouletteConfig() {
  console.log("Seeding roulette configuration...");

  // Check if configs already exist
  const existing = await db.select().from(rouletteConfig).limit(1);
  
  if (existing.length > 0) {
    console.log("Roulette configuration already exists. Skipping seed.");
    return;
  }

  // Main roulette configuration - 12 segmentos conforme especificado
  // Multiplicadores: 1X, 2X, 3X, 4X, 5X, 10X, 15X, 20X, 30X, 50X, 100X, 100X (dois 100x)
  const mainConfigs = [
    { type: 'main' as const, multiplier: 1, probability: '15.00' },    // 15% chance 1x
    { type: 'main' as const, multiplier: 2, probability: '15.00' },    // 15% chance 2x
    { type: 'main' as const, multiplier: 3, probability: '12.00' },    // 12% chance 3x
    { type: 'main' as const, multiplier: 4, probability: '10.00' },    // 10% chance 4x
    { type: 'main' as const, multiplier: 5, probability: '10.00' },    // 10% chance 5x
    { type: 'main' as const, multiplier: 10, probability: '10.00' },   // 10% chance 10x
    { type: 'main' as const, multiplier: 15, probability: '8.00' },    // 8% chance 15x
    { type: 'main' as const, multiplier: 20, probability: '7.00' },    // 7% chance 20x
    { type: 'main' as const, multiplier: 30, probability: '5.00' },    // 5% chance 30x
    { type: 'main' as const, multiplier: 50, probability: '4.00' },    // 4% chance 50x
    { type: 'main' as const, multiplier: 100, probability: '2.00' },   // 2% chance 100x (primeiro)
    { type: 'main' as const, multiplier: 100, probability: '2.00' },   // 2% chance 100x (segundo)
  ];

  // Bonus roulette configuration (optional, can be activated later)
  const bonusConfigs = [
    { type: 'bonus' as const, multiplier: 0, probability: '30.00' },
    { type: 'bonus' as const, multiplier: 2, probability: '25.00' },
    { type: 'bonus' as const, multiplier: 3, probability: '20.00' },
    { type: 'bonus' as const, multiplier: 4, probability: '15.00' },
    { type: 'bonus' as const, multiplier: 10, probability: '10.00' },
  ];

  try {
    // Insert main configs
    for (const config of mainConfigs) {
      await db.insert(rouletteConfig).values({
        type: config.type,
        multiplier: config.multiplier,
        probability: config.probability,
        isActive: true,
      });
    }

    // Insert bonus configs (inactive by default)
    for (const config of bonusConfigs) {
      await db.insert(rouletteConfig).values({
        type: config.type,
        multiplier: config.multiplier,
        probability: config.probability,
        isActive: false,
      });
    }

    console.log("Roulette configuration seeded successfully!");
    console.log(`- ${mainConfigs.length} main roulette configurations`);
    console.log(`- ${bonusConfigs.length} bonus roulette configurations`);
  } catch (error) {
    console.error("Error seeding roulette config:", error);
    throw error;
  }
}

// Run seed
seedRouletteConfig()
  .then(() => {
    console.log("Seed completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
