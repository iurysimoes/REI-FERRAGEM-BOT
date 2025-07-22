// back-end/controllers/controllerNotificacoes.js

const db = require('../database/db');
const { Client } = require('whatsapp-web.js');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verificarNovosPedidos(client) {
  try {
    const resultado = await db.query(`
      SELECT PC.PRCR_CELULAR    NUMEROZAP,
             AP.ANPD_ANDAMENTO  ANDAMENTO,
             PS.PDSD_NR_PEDIDO  PEDIDO,
             PS.PEDIDO_SAIDA_ID PEDIDO_SAIDA_ID,
             AP.ANDAMENTO_PEDIDO_ID ANDAMENTO_PEDIDO_ID
            
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
      const numeroFormatado = `55${pedido.NUMEROZAP}@c.us`;
      if (!pedido.PEDIDO || !pedido.ANDAMENTO || !numeroFormatado) continue;

      console.log('📲 Enviando para:', numeroFormatado);

      try {
        await client.sendMessage(
          numeroFormatado,
          `📦 Olá! Seu pedido *${pedido.PEDIDO}* está com o status: *${pedido.ANDAMENTO}*.`
        );

        // Atraso aleatório entre mensagens da mesma pessoa
        await sleep(1000 + Math.floor(Math.random() * 2000)); // 1~3 segundos

        if (pedido.ANDAMENTO.toLowerCase() === 'finalizado') {
          await client.sendMessage(
            numeroFormatado,
            `🚚 Pedido *${pedido.PEDIDO}* foi finalizado. Favor aguardar a transportadora.`
          );

          await sleep(1000 + Math.floor(Math.random() * 2000)); // outro delay se enviar 2 mensagens
        }

        await db.query(
          `UPDATE ANDAMENTO_PEDIDO ANP
              SET ANP.ANPD_ENVIADO_ZAP = 'Sim' 
            WHERE ANP.PEDIDO_SAIDA_ID = :pedido_saida_id
              AND ANP.ANDAMENTO_PEDIDO_ID = :andamento_pedido_id`,
          [pedido.PEDIDO_SAIDA_ID, pedido.ANDAMENTO_PEDIDO_ID],
          { autoCommit: true }
        );

        console.log(`✅ Status atualizado no banco para ${pedido.PEDIDO}`);

        // Delay entre clientes (entre 3 a 6 segundos aleatório)
        await sleep(3000 + Math.floor(Math.random() * 3000));
        
      } catch (err) {
        console.error(`❌ Erro ao enviar mensagem para ${numeroFormatado}:`, err.message);
      }
    }

  } catch (error) {
    console.error('[verificarNovosPedidos] Erro:', error);
  }
}

module.exports = { verificarNovosPedidos };
