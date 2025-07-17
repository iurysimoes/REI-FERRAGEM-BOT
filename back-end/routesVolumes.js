const express = require('express');
const router = express.Router();
const { query } = require('../db'); // pega a query do seu db.js

router.post('/validar-volume', async (req, res) => {
  const { idPedido, codigoBarras, userId } = req.body;

  if (!idPedido || !codigoBarras) {
    return res.status(400).json({ sucesso: false, mensagem: 'Pedido e código de barras são obrigatórios.' });
  }

  try {
    // Verifica se o código pertence ao pedido
    const selectSql = `
      SELECT COUNT(*) AS QTD
      FROM volume_conferencia c
     WHERE c.pedido_saida_id       = :idPedido
       AND c.volume_conferencia_id = :codigoBarras
    `;

    const result = await query(selectSql, [idPedido, codigoBarras]);

    if (result.rows[0].QTD === 0) {
      return res.json({ sucesso: false, mensagem: 'Código de barras não pertence a este pedido.' });
    }

    // Atualiza para marcar como conferido
    const updateSql = `
      UPDATE volume_conferencia
         SET volc_confirma_cliente_zap = 'Sim'
       WHERE pedido_saida_id           = :idPedido
         AND volume_conferencia_id     = :codigoBarras
    `;

    await query(updateSql, [idPedido, codigoBarras], { autoCommit: true }); // importante o commit

    res.json({ sucesso: true, mensagem: `Volume com código ${codigoBarras} marcado como conferido.` });
  } catch (error) {
    console.error('Erro na validação do volume:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao validar o volume.' });
  }
});

module.exports = router;
