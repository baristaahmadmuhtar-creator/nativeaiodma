'use strict';
const { z } = require('zod');

function loadConfig(env = process.env) {
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
  const result = schema.safeParse(env);
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
