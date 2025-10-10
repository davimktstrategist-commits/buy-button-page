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

  // Main roulette configuration - conforme imagens fornecidas
  // Prêmios: 0x, 5x, 15x, 2x, 20x, 100x (6 segmentos)
  const mainConfigs = [
    { type: 'main' as const, multiplier: 0, probability: '5.00' },     // 5% chance 0x
    { type: 'main' as const, multiplier: 5, probability: '5.00' },     // 5% chance 5x
    { type: 'main' as const, multiplier: 15, probability: '50.00' },   // 50% chance 15x
    { type: 'main' as const, multiplier: 2, probability: '5.00' },     // 5% chance 2x
    { type: 'main' as const, multiplier: 20, probability: '5.00' },    // 5% chance 20x
    { type: 'main' as const, multiplier: 100, probability: '5.00' },   // 5% chance 100x
    { type: 'main' as const, multiplier: 10, probability: '6.50' },    // 6.5% chance 10x
    { type: 'main' as const, multiplier: 50, probability: '2.00' },    // 2% chance 50x
  ];

  // Bonus roulette configuration - conforme imagens fornecidas
  // Prêmios: 2x, 3x, 4x, 1x (4 segmentos)
  const bonusConfigs = [
    { type: 'bonus' as const, multiplier: 2, probability: '5.00' },
    { type: 'bonus' as const, multiplier: 3, probability: '5.00' },
    { type: 'bonus' as const, multiplier: 4, probability: '20.00' },
    { type: 'bonus' as const, multiplier: 1, probability: '5.00' },
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

    // Insert bonus configs
    for (const config of bonusConfigs) {
      await db.insert(rouletteConfig).values({
        type: config.type,
        multiplier: config.multiplier,
        probability: config.probability,
        isActive: true,
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
