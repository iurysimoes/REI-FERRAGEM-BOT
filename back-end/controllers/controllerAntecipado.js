const { MessageMedia } = require('whatsapp-web.js');
const { getAtendente } = require('../services/atendimentoService');
const flowControl = require('../flowcontrol');

async function iniciar(client, msg) {
  const user = msg.from;

  await client.sendMessage(user, '📩 Por favor, envie o comprovante de pagamento (imagem ou PDF).');

  await flowControl.setStep(user, 'aguardando_comprovante_antecipado');
}

async function continuar(client, msg) {
  const user = msg.from;

  if (!msg.hasMedia) {
    await client.sendMessage(user, '⚠️ Por favor, envie uma imagem ou PDF como comprovante.');
    return;
  }

  const media = await msg.downloadMedia();

  if (!media || !media.data) {
    await client.sendMessage(user, '⚠️ O arquivo enviado não pôde ser lido. Tente novamente com uma imagem ou PDF.');
    return;
  }

  const atendenteTel = await getAtendente('antecipado');
  if (!atendenteTel) {
    await client.sendMessage(user, '❌ Nenhum atendente de pedidos antecipados disponível no momento.');
    await flowControl.clearStep(user);
    return;
  }

  const mediaMsg = new MessageMedia(media.mimetype, media.data, media.filename);

  try {
    await client.sendMessage(`${atendenteTel}@c.us`, mediaMsg, {
      caption: `📩 Novo comprovante de pagamento recebido do cliente ${user}`
    });
    await client.sendMessage(user, '✅ Comprovante recebido com sucesso. Obrigado!');
    const user2 = msg.author;
    await flowControl.clearStep(user);
    await flowControl.clearStep(user2);
  } catch (error) {
    console.error('Erro ao enviar comprovante para atendente:', error);
    await client.sendMessage(user, '❌ Ocorreu um erro ao enviar seu comprovante. Tente novamente mais tarde.');
  }
}

module.exports = { iniciar, continuar };
