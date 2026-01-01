import { DataSource } from 'typeorm';
import * as path from 'path';

// Helper function to get database config (same as in app.module.ts)
function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Parse PostgreSQL connection string: postgresql://user:password@host:port/database
    const url = new URL(databaseUrl);
    return {
      type: 'postgres' as const,
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading slash
    };
  }

  // Fall back to individual environment variables
  return {
    type: 'postgres' as const,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

export const AppDataSource = new DataSource({
  ...getDatabaseConfig(),
  entities: [path.join(__dirname, '..', '**', '*.entity{.ts,.js}')],
  synchronize: true,
  logging: false,
});
