// back-end/controllers/controllerPedido.js

const db = require('../database/db');
const { getAtendente } = require('../services/atendimentoService');
//const { setStep, getStep, clearStep } = require('../flowcontrol' );
const flowControl = require('../flowcontrol');

async function iniciar(client, msg) {
  const userId = msg.author || msg.from;
  const etapa = await flowControl.getStep(userId);
  const texto = msg.body.trim();

  if (!etapa) {
  //if (etapa === 'acompanhamento'){
    await client.sendMessage(msg.from, '📦 Digite o número do seu pedido ou *2* para falar com um atendente.');
    await flowControl.setStep(userId, 'AGUARDANDO_NUMERO');
    return;  // IMPORTANTE: interrompe aqui para não continuar o código
  }

  if (etapa === 'AGUARDANDO_OPCAO_DEPOIS_DO_PEDIDO' && texto === '10') {
    const dados = await flowControl.getData(userId);
    const setor = dados?.setorEscolhido || 'geral';
    await flowControl.clearStep(userId);
    return redirecionarAtendente(client, msg, setor);
  }
  if (etapa === 'AGUARDANDO_NUMERO') {
    if (texto === '2') {
      await flowControl.clearStep(userId);
      return redirecionarAtendente(client, msg, 'pedidos');
    }
    
    if (texto === 'menu' || texto === '0') {
      await flowControl.clearStep(userId);
      return client.sendMessage(
        msg.from,
        '🤖 Você voltou ao menu principal! Digite uma das opções abaixo:\n\n' +
        '1️⃣ - Pedido\n' +
        '2️⃣ - Pedido Chegou\n' +
        '3️⃣ - Financeiro\n' +
        '4️⃣ - Cadastro Cliente\n' +
        '5️⃣ - Antecipado\n' +
        '6️⃣ - Pós-Venda\n' +
        '7️⃣ - Volume Danificado\n' +
        '8️⃣ - Volume Faltou\n' +
        '9️⃣ - Outros Assuntos'
      );
    }
    //const numero = texto;
    const nTexto = texto;

    // Verifica se é um número válido
    if (!/^\d+$/.test(nTexto)) {
      await msg.reply('❌ Por favor, envie apenas o número do pedido (somente números).');
      return;
    }

    const numero = parseInt(nTexto); // agora com segurança
      console.log(numero);
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
          //await flowControl.clearStep(userId);
          // Define próxima etapa e salva o setor, para que o "10" funcione depois
          await flowControl.setStep(userId, 'AGUARDANDO_OPCAO_DEPOIS_DO_PEDIDO');
          await flowControl.setData(userId, { setorEscolhido: 'pedidos' });
          await client.sendMessage(
          msg.from,'✅ Caso precise de mais ajuda:\n\n' +
            '- Digite 🔟 para falar com um atendente\n' +
            '- Digite *menu* ou 0️⃣ para voltar ao menu principal'
          );
        } else {
          await client.sendMessage(msg.from, '❌ Pedido não encontrado. Digite novamente ou 0️⃣ para voltar ao menu.');
          await flowControl.clearStep(userId);
        }
      } catch (err) {
        console.error('[controllerPedido] Erro na consulta:', err);
        await client.sendMessage(msg.from, '⚠️ Ocorreu um erro ao buscar o pedido. Tente novamente mais tarde.');
      }

      return;  // interrompe aqui
  }
}

async function chegou(client, msg) {
  //const userId = msg.from;
  const userId = msg.author || msg.from;
  const etapa = await flowControl.getStep(userId);
  const texto = msg.body.trim();

  if (!etapa) {
    console.log('entrou aqui')
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
        `ℹ️ *Como prosseguir com seu pedido:*\n\n- Verifique os volumes com o leitor de código de barras\n- Confirme os volumes recebidos\n, Para retornar digite Menu ou digite 0️⃣\n.`
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
        return client.sendMessage(msg.from, '❌ Pedido não encontrado. Digite novamente o número do pedido ou 0️⃣ para voltar ao menu.');
      }

      await flowControl.clearStep(userId);

      const baseUrl = 'http://localhost:3001'; // Substituir pelo seu domínio real ou ngrok
      const url = `${baseUrl}/index.html?idPedido=${encodeURIComponent(numeroPedido)}&userId=${encodeURIComponent(userId)}`;
      
      return client.sendMessage(
        msg.from,
        `📦 Beleza! Agora clique no link abaixo para escanear os volumes do pedido.\n\n` +
        //`👉 https://rei-ferragem-bot.vercel.app/?userId=${userId}&idPedido=${numeroPedido}\n\n` +
        `👉 ${url}\n\n` +
        `📸 Quando terminar de escanear, clique no botão "Finalizar Escaneamento" que vai te redirecionar pro WhatsApp.`
      );
      
    } catch (err) {
      console.error('[chegou] Erro ao validar pedido:', err);
      return client.sendMessage(msg.from, '⚠️ Erro ao verificar o número do pedido. Tente novamente mais tarde ou digite 0️⃣ para voltar ao menu.');
    }
  }
}

async function redirecionarAtendente(client, msg, setor) {
  const tel = await getAtendente(setor);
  const userId = msg.author || msg.from;
  if (!tel) return client.sendMessage(msg.from, 'Desculpa, não achei um atendente agora.');
  
  await flowControl.clearStep(userId);

  await client.sendMessage(
    msg.from,
    //`📞 Atendente disponível: https://wa.me/55${tel}?text=${encodeURIComponent('Oi, preciso de ajuda sobre ' + setor)}`
     `📞 Fale com o atendente Clicando abaixo:\nhttps://wa.me/55${tel}?text=${encodeURIComponent('Oi, preciso de ajuda sobre ' + setor)}`
  );
}

module.exports = { iniciar, chegou, redirecionarAtendente };
