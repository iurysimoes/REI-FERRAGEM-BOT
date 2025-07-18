// back-end/controllers/controllerNotificacoes.js

const db = require('../database/db');
const { Client } = require('whatsapp-web.js');

async function verificarNovosPedidos(client) {
  try {
    const resultado = await db.query(`
      SELECT PC.PRCR_CELULAR    numerozap,
             AP.ANPD_ANDAMENTO  andamento,
             PS.PDSD_NR_PEDIDO  pedido,
             PS.PEDIDO_SAIDA_ID pedido_saida_id,
             AP.ANDAMENTO_PEDIDO_ID andamento_pedido_id
            
        FROM ANDAMENTO_PEDIDO AP,
             PEDIDO_SAIDA     PS,
             PARCEIRO         PC
        WHERE PS.PEDIDO_SAIDA_ID = AP.PEDIDO_SAIDA_ID
          AND PC.PARCEIRO_ID     = PS.PARCEIRO_ID
          AND NVL(AP.ANPD_ENVIADO_ZAP,'Nao') = 'Nao'
          and ps.pedido_saida_id  = 'aafaaaaaaacwaaaaaewh'
          AND AP.ANPD_DATA = (SELECT MAX(ANP2.ANPD_DATA)
                                FROM ANDAMENTO_PEDIDO ANP2
                               WHERE ANP2.PEDIDO_SAIDA_ID = PS.PEDIDO_SAIDA_ID)
    `);

    const pedidos = resultado.rows;

    for (const pedido of pedidos) {
      const numeroFormatado = `55${pedido.numerozap}@c.us`; // Ex: 5599999999999@c.us

      if (!pedido.pedido || !pedido.andamento || !numeroFormatado) continue;

      // Envia status pro cliente
      await client.sendMessage(
        numeroFormatado,
        `📦 Olá! Seu pedido *${pedido.pedido}* está com o status: *${pedido.andamento}*.`
      );

      // Se o status for "Finalizado", envia mensagem adicional
      if (pedido.andamento.toLowerCase() === 'finalizado') {
        await client.sendMessage(
          numeroFormatado,
          `🚚 Pedido *${pedido.pedido}* foi finalizado. Favor aguardar a transportadora.`
        );
      }

      // Marca que o zap já foi enviado
      await db.query(
        `UPDATE ANDAMENTO_PEDIDO ANP
            SET ANP.ANPD_ENVIADO_ZAP = 'Sim' 
          WHERE ANP.PEDIDO_SAIDA_ID = :pedido_saida_id
            AND ANP.ANDAMENTO_PEDIDO_ID = :andamento_pedido_id
          `,
        [pedido.pedido_saida_id,pedido.andamento_pedido_id],
        { autoCommit: true }
      );
    }
  } catch (error) {
    console.error('[verificarNovosPedidos] Erro:', error);
  }
}

module.exports = { verificarNovosPedidos };
