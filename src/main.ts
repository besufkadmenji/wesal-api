import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // Swagger/OpenAPI setup
  const config = new DocumentBuilder()
    .setTitle('Wesal API')
    .setDescription('Wesal API documentation with CSV export endpoints')
    .setVersion('1.0')
    .addTag('Export', 'CSV Export endpoints for all entities')
    .addTag('Users', 'User management')
    .addTag('Providers', 'Provider management')
    .addTag('Listings', 'Listing management')
    .addTag('Categories', 'Category management')
    .addTag('Cities', 'City management')
    .addTag('Countries', 'Country management')
    .addTag('Banks', 'Bank management')
    .addTag('Delivery Companies', 'Delivery company management')
    .addTag('Contracts', 'Contract management')
    .addTag('Payments', 'Payment management')
    .addTag('Ratings', 'Rating management')
    .addTag('Complaints', 'Complaint management')
    .addTag('Notifications', 'Notification management')
    .addTag('FAQs', 'FAQ management')
    .addTag('Contact Messages', 'Contact message management')
    .addTag('Signed Contracts', 'Signed contract management')
    .addTag('Favorites', 'Favorite management')
    .addTag('Conversations', 'Conversation management')
    .addTag('Tracking', 'User tracking management')
    .addTag('Admins', 'Admin management')
    .addTag('Permissions', 'Permission management')
    .addTag('Admin Permissions', 'Admin permission management')
    .addTag('Settings', 'Application settings')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`✓ Application is running on port ${port}`);
  console.log(
    `✓ Swagger documentation available at http://localhost:${port}/api`,
  );

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
