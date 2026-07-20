import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({ path: '.env.local' });

if(!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_DATABASE_ID || !process.env.CLOUDFLARE_D1_TOKEN) {
  throw new Error("Please provide all the Cloudflare credentials");
}

export default defineConfig({
  out: './drizzle',
  schema: './lib/db/schema.ts',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID,
    token: process.env.CLOUDFLARE_D1_TOKEN,
  },
});
