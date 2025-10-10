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

  // Main roulette configuration with balanced probabilities
  const mainConfigs = [
    { type: 'main' as const, multiplier: 0, probability: '40.00' },    // 40% chance to lose
    { type: 'main' as const, multiplier: 2, probability: '20.00' },    // 20% chance 2x
    { type: 'main' as const, multiplier: 5, probability: '20.00' },    // 20% chance 5x
    { type: 'main' as const, multiplier: 10, probability: '10.00' },   // 10% chance 10x
    { type: 'main' as const, multiplier: 15, probability: '5.00' },    // 5% chance 15x
    { type: 'main' as const, multiplier: 100, probability: '5.00' },   // 5% chance 100x
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
