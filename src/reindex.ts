/**
 * Reindex all categories and listings into Elasticsearch.
 * Usage: pnpm run search:reindex
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SearchService } from './search/search.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const searchService = app.get(SearchService);
    await searchService.ensureIndices();
    await searchService.reindexAll();
    console.log('✅ Reindex complete');
  } catch (err) {
    console.error('❌ Reindex failed', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

void bootstrap();
