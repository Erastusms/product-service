// src/config/env.ts

import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SERVICE_BASE_URL: z.string().url('AUTH_SERVICE_BASE_URL must be a valid URL'),
  AUTH_SERVICE_ME_ENDPOINT: z.string().default('/v1/auth/me'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
