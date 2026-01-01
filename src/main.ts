import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ValidationExceptionFilter } from '../lib/i18n/validation.exception-filter';
import { runDatabaseSeeds } from './database/seeds/run-seeds';
import { AppDataSource } from './database/data-source';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe for both HTTP and GraphQL
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if extra properties are provided
      transform: true, // Automatically transform payloads to DTO class instances
      transformOptions: {
        enableImplicitConversion: true, // Convert primitive types (string to number, etc.)
      },
      stopAtFirstError: false, // Collect all errors
    }),
  );

  // Register validation exception filter for localized error messages
  app.useGlobalFilters(new ValidationExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`✓ Application is running on port ${port}`);

  // Run database seeding in background after app starts (non-blocking)
  // This ensures the app is ready to accept requests even if seeding takes time
  const shouldSeed =
    process.env.AUTO_SEED !== 'false' &&
    (process.env.NODE_ENV === 'production' ||
      process.env.NODE_ENV === 'development');

  if (shouldSeed) {
    void seedDatabaseInBackground();
  }
}

async function seedDatabaseInBackground(): Promise<void> {
  try {
    // Give the app a moment to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('🌱 Starting background database seeding...');

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await runDatabaseSeeds(AppDataSource);

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during background seeding:', error);
    // Don't crash the app, just log the error
  }
}

void bootstrap();
