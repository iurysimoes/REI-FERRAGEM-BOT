const oracledb = require('oracledb');
const dbConfig = require('../config/db');
require('dotenv').config();

try {
  oracledb.initOracleClient({ libDir: 'C:/oracle/instantclient_21_3' }); // ajusta o caminho conforme teu ambiente
} catch (err) {
  console.error('Erro ao iniciar Oracle Client:', err);
  process.exit(1);
}

async function createPool() {
  if (!global.oraclePool) {
    global.oraclePool = await oracledb.createPool(dbConfig);
  }
  return global.oraclePool;
}

async function query(sql, binds = [], opts = {}) {
  const pool = await createPool();
  const conn = await pool.getConnection();
   // Define outFormat se não foi passado
  opts.outFormat = opts.outFormat || oracledb.OUT_FORMAT_OBJECT;
  try {
    return await conn.execute(sql, binds, opts);
  } finally {
    await conn.close();
  }
}

module.exports = { query };
