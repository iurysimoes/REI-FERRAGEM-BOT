// back-end/controllers/controllerPedido.js

const db = require('../database/db');
const { getAtendente } = require('../services/atendimentoService');
//const { setStep, getStep, clearStep } = require('../flowcontrol');
const flowControl = require('../flowcontrol');


async function iniciar(client, msg) {
  const userId = msg.author || msg.from;
  const etapa = getStep(userId);
  const texto = msg.body.trim();

  if (!etapa) {
    await client.sendMessage(msg.from, '📦 Digite o número do seu pedido ou *2* para falar com um atendente.');
    setStep(userId, 'AGUARDANDO_NUMERO');
    return;
  }

  if (etapa === 'AGUARDANDO_NUMERO' && texto === '2') {
    clearStep(userId);
    return redirecionarAtendente(client, msg, 'pedidos');
  }

  if (etapa === 'AGUARDANDO_NUMERO') {
    const numero = texto;

    try {
      const qr = await db.query(
        `SELECT ANP.ANPD_DATA,
                ANP.ANPD_ANDAMENTO,
                PS.PDSD_NR_PEDIDO
           FROM PEDIDO_SAIDA PS,
                ANDAMENTO_PEDIDO ANP
          WHERE PS.PEDIDO_SAIDA_ID = ANP.PEDIDO_SAIDA_ID
            AND PS.PDSD_NR_PEDIDO = :n
            AND ANP.ANPD_DATA = (
                SELECT MAX(ANP2.ANPD_DATA)
                  FROM ANDAMENTO_PEDIDO ANP2
                 WHERE ANP2.PEDIDO_SAIDA_ID = PS.PEDIDO_SAIDA_ID
            )`,
        [numero]
      );

      if (qr.rows?.length) {
        await client.sendMessage(msg.from, `📦 Pedido *${numero}* - Status: *${qr.rows[0].ANPD_ANDAMENTO}*`);
        await client.sendMessage(msg.from, '✅ Caso precise de mais ajuda, digite *2* para falar com um atendente.');
      } else {
        await client.sendMessage(msg.from, '❌ Pedido não encontrado. Digite novamente ou *2* para atendimento.');
      }
    } catch (err) {
      console.error('[controllerPedido] Erro na consulta:', err);
      await client.sendMessage(msg.from, '⚠️ Ocorreu um erro ao buscar o pedido. Tente novamente mais tarde.');
    }

    return;
  }
}

async function chegou(client, msg) {
  const userId = msg.from;
  const etapa = await flowControl.getStep(userId);
  const texto = msg.body.trim();

  if (!etapa) {
    await flowControl.setStep(userId, 'chegou_menu');
    return client.sendMessage(
      msg.from,
      `📦 *Pedido Chegou*\n\nEscolha uma opção:\n1️⃣ Ler código de barras dos volumes\n2️⃣ Informações de como prosseguir\n3️⃣ Falar com atendente`
    );
  }

  if (etapa === 'chegou_menu') {
    if (texto === '1') {
      await flowControl.setStep(userId, 'aguardando_numero_pedido_codigo');
      return client.sendMessage(msg.from, '🔢 Por favor, digite o número do pedido para iniciar a leitura dos volumes:');
    }

    if (texto === '2') {
      await flowControl.clearStep(userId);
      return client.sendMessage(
        msg.from,
        `ℹ️ *Como prosseguir com seu pedido:*\n\n- Verifique os volumes com o leitor de código de barras\n- Confirme os volumes recebidos\n- Em caso de divergência, selecione 'Falar com atendente'\n\nSe precisar de ajuda, digite *3*.`
      );
    }

    if (texto === '3') {
      await flowControl.clearStep(userId);
      return redirecionarAtendente(client, msg, 'pedidos');
    }

    return client.sendMessage(msg.from, '❗ Opção inválida. Digite *1*, *2* ou *3*.');
  }

  if (etapa === 'aguardando_numero_pedido_codigo') {
    const numeroPedido = texto;

    // Validação opcional no banco
    try {
      const pedido = await db.query(
        `SELECT PDSD_NR_PEDIDO FROM PEDIDO_SAIDA WHERE PDSD_NR_PEDIDO = :n`,
        [numeroPedido]
      );

      if (pedido.rows?.length === 0) {
        return client.sendMessage(msg.from, '❌ Pedido não encontrado. Digite novamente o número do pedido ou *voltar* para o menu.');
      }

      await flowControl.clearStep(userId);

      const baseUrl = 'https://seuservidor.com'; // Substituir pelo seu domínio real ou ngrok
      const url = `${baseUrl}/index.html?idPedido=${encodeURIComponent(numeroPedido)}&userId=${encodeURIComponent(userId)}`;

      return client.sendMessage(
        msg.from,
        `📦 Beleza! Agora clique no link abaixo para escanear os volumes do pedido.\n\n` +
        `👉 https://rei-ferragem-bot.vercel.app/?userId=${userId}&idPedido=${numeroPedido}\n\n` +
        `📸 Quando terminar de escanear, clique no botão "Finalizar Escaneamento" que vai te redirecionar pro WhatsApp.`
      );
      
  

    } catch (err) {
      console.error('[chegou] Erro ao validar pedido:', err);
      return client.sendMessage(msg.from, '⚠️ Erro ao verificar o número do pedido. Tente novamente mais tarde.');
    }
  }
}

async function redirecionarAtendente(client, msg, setor) {
  const tel = await getAtendente(setor);
  if (!tel) return client.sendMessage(msg.from, 'Desculpa, não achei um atendente agora.');

  await client.sendMessage(
    msg.from,
    //`📞 Atendente disponível: https://wa.me/55${tel}?text=${encodeURIComponent('Oi, preciso de ajuda sobre ' + setor)}`
     `📞 Fale com o atendente Clicando abaixo:\nhttps://wa.me/55${tel}?text=${encodeURIComponent('Oi, preciso de ajuda sobre ' + setor)}`
  );
}

module.exports = { iniciar, chegou, redirecionarAtendente };
