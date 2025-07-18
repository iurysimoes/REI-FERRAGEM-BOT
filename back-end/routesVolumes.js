const express = require('express');
const router = express.Router();
//const { query } = require('../database/db'); // pega a query do seu db.js
const db = require('./database/db');

router.post('/validar-volume', async (req, res) => {
  const { idPedido, codigoBarras, userId } = req.body;

  if (!idPedido || !codigoBarras) {
    return res.status(400).json({ sucesso: false, mensagem: 'Pedido e código de barras são obrigatórios.' });
  }
   //idpedido abaixo esta passando nr no pedido...??
  try {
    //pegando pedido_saida_id somente para usar abaixo
    const pedidoResult = await connection.execute(
      `SELECT ps.pedido_saida_id 
         FROM pedido_saida ps 
        WHERE ps.Pdsd_Nr_Pedido = :idPedido`,
      { idPedido }
    );
    const pedido_saida_id = pedidoResult.rows[0][0];
    // Verifica se o código pertence ao pedido
    const selectSql = `
      SELECT COUNT(*) AS QTD
      FROM volume_conferencia c
     WHERE ps.pedido_saida_id       = :pedido_saida_id
       AND c.volume_conferencia_id = :codigoBarras
    `;

    const result = await db.query(selectSql, [pedido_saida_id, codigoBarras]);
    console.log(idPedido);
    console.log(codigoBarras);
    if (result.rows[0].QTD === 0) {
      return res.json({ sucesso: false, mensagem: 'Código de barras não pertence a este pedido.' });
    }

    // Atualiza para marcar como conferido
    const updateSql = `
      UPDATE volume_conferencia
         SET volc_confirma_cliente_zap = 'Sim'
       WHERE pedido_saida_id           = :pedido_saida_id
         AND volume_conferencia_id     = :codigoBarras
    `;

    await db.query(updateSql, [pedido_saida_id, codigoBarras], { autoCommit: true }); // importante o commit

    res.json({ sucesso: true, mensagem: `Volume com código ${codigoBarras} marcado como conferido.` });
  } catch (error) {
    console.error('Erro na validação do volume:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao validar o volume.' });
  }
});

module.exports = router;
