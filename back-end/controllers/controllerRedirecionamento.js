const { getAtendente } = require('../services/atendimentoService');

async function redirecionar(client, msg, setor, motivoTexto) {
  const tel = await getAtendente(setor);
  console.log(tel);
  if (!tel) {
    await msg.reply('Nenhum atendente disponível nesse setor no momento. Tente novamente mais tarde.');
    return;
  }

  const texto = `Oi, preciso de atendimento sobre ${motivoTexto}`;
  const link = `https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`;

  try {
    await msg.reply(`🔁 Encaminhando você para o setor responsável: *${motivoTexto}*
Clique no link para falar com o atendente:
${link}`);
    console.log(`Usuário ${msg.from} redirecionado para ${motivoTexto} - Atendente: ${tel}`);
  } catch (error) {
    console.error('Erro ao enviar mensagem de redirecionamento:', error);
  }
}

module.exports = { redirecionar };
