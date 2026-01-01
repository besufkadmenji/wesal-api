import 'reflect-metadata';
import * as path from 'path';
import { AppDataSource } from './database/data-source';
import { runDatabaseSeeds } from './database/seeds/run-seeds';

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await runDatabaseSeeds(AppDataSource);

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }

    console.log('\n✅ Seeding completed and database connection closed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

void seedDatabase();
