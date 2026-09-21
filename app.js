'use strict';
const express = require('express');
const { loadConfig } = require('./src/server/config');
const { createDatabase } = require('./src/infrastructure/database');
const { createApp } = require('./src/server/app');

const gateway = express();
let initialization;

async function initialize() {
  const config = loadConfig();
  const db = createDatabase(config.DATABASE_URL);
  try {
    const role = (await db.pool.query(
      'SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user'
    )).rows[0];
    if (role.rolsuper || role.rolbypassrls) {
      throw new Error('Runtime database role must not bypass row security');
    }
    return createApp({ db, config });
  } catch (error) {
    await db.close();
    throw error;
  }
}

gateway.use(async (req, res) => {
  try {
    if (!initialization) {
      initialization = initialize().catch(error => {
        initialization = null;
        throw error;
      });
    }
    const app = await initialization;
    return app(req, res);
  } catch (error) {
    console.error(JSON.stringify({ event: 'serverless_boot_failed', code: error.code || 'BOOT_FAILED' }));
    return res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Layanan belum tersedia. Coba lagi nanti.', retryable: true }
    });
  }
});

module.exports = gateway;
