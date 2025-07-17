// back-end/controllers/controllerAntecipado.js

const { MessageMedia } = require('whatsapp-web.js');
const { getAtendente } = require('../services/atendimentoService');

async function iniciar(client, msg) {
  const media = msg.hasMedia ? await msg.downloadMedia() : null;

if (!media || !media.data) {
  await msg.reply('⚠️ O arquivo enviado não pôde ser lido. Tente novamente com uma imagem ou PDF.');
  return;
}


  const atendenteTel = await getAtendente('antecipado');

  if (!atendenteTel) {
    await msg.reply('Nenhum atendente de pedidos antecipados disponível no momento.');
    return;
  }

  const mediaMsg = new MessageMedia(media.mimetype, media.data, media.filename);
  await client.sendMessage(`${atendenteTel}@c.us`, mediaMsg, {
    caption: `📩 Novo comprovante de pagamento recebido do cliente ${msg.from}`
  });

  await msg.reply('✅ Comprovante recebido com sucesso. Obrigado!');
}

module.exports = { iniciar };
