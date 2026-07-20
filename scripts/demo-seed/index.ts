import 'dotenv/config';
import { demoSeedUsage, parseDemoSeedOptions } from './demo-seed.config';
import { runDemoSeed } from './demo-seed.runner';

async function main(): Promise<void> {
  try {
    const options = parseDemoSeedOptions(process.argv.slice(2));
    await runDemoSeed(options);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error(demoSeedUsage());
    process.exitCode = 1;
  }
}

void main();
