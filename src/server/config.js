'use strict';
const { z } = require('zod');

function loadConfig(env = process.env) {
  const input = { ...env };
  if (env.DB_RUNTIME_PASSWORD || env.DB_RUNTIME_USER) {
    if (!env.DATABASE_URL_UNPOOLED || !env.DB_RUNTIME_PASSWORD) {
      throw new Error('Invalid environment: DATABASE_URL_UNPOOLED, DB_RUNTIME_PASSWORD');
    }
    const role = env.DB_RUNTIME_USER || 'aiodma_runtime';
    if (!/^[a-z][a-z0-9_]{2,62}$/.test(role) || !/^[A-Za-z0-9_-]{32,128}$/.test(env.DB_RUNTIME_PASSWORD)) {
      throw new Error('Invalid environment: DB_RUNTIME_USER, DB_RUNTIME_PASSWORD');
    }
    const runtimeUrl = new URL(env.DATABASE_URL_UNPOOLED);
    if (!['postgres:','postgresql:'].includes(runtimeUrl.protocol)) {
      throw new Error('Invalid environment: DATABASE_URL_UNPOOLED');
    }
    runtimeUrl.username = role;
    runtimeUrl.password = env.DB_RUNTIME_PASSWORD;
    input.DATABASE_URL = runtimeUrl.href;
  }
  const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8081),
    HOST: z.string().default('127.0.0.1'),
    DATABASE_URL: z.string().url().refine(value=>['postgres:','postgresql:'].includes(new URL(value).protocol)),
    SESSION_SECRET: z.string().min(32),
    PUBLIC_BASE_URL: z.string().url().refine(value=>{
      const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==='/';
    }).default('http://localhost:8081'),
    GEMINI_API_KEY: z.string().optional(),
    AI_MODEL: z.string().regex(/^[a-zA-Z0-9._-]+$/).optional(),
  });
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error('Invalid environment: ' + result.error.issues.map(i => i.path.join('.')).join(', '));
  }
  const config = result.data;
  if (config.NODE_ENV === 'production' && !config.PUBLIC_BASE_URL.startsWith('https://')) {
    throw new Error('PUBLIC_BASE_URL must use HTTPS in production');
  }
  return config;
}

module.exports = { loadConfig };
