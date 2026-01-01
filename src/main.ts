import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ValidationExceptionFilter } from '../lib/i18n/validation.exception-filter';

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

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
