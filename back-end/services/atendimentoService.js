const db = require('../database/db');

async function getAtendente(setor) {
  const sql = `
    select '55'||S.WHATSAPP_ATENDENTE TELEFONE_WHATSAPP
     from ATENDENTE_WHATSAPP S 
    where lower(S.NOME_SETOR) = :setor
      and rownum <= 1
  `;

  try {
    const resultado = await db.query(sql, [setor.toLowerCase()]);
    if (resultado.rows.length > 0) {
      return resultado.rows[0].TELEFONE_WHATSAPP || resultado.rows[0].telefone_whatsapp;
    }
  } catch (error) {
    console.error('Erro ao buscar atendente:', error);
  }

  return null;
}

module.exports = { getAtendente };
