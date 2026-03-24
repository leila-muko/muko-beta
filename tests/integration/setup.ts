// Integration test setup — loads .env.test before any modules initialize.
// Referenced by vitest.integration.config.ts as a setupFile.
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.test') });
