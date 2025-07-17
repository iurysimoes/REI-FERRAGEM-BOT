const { getAtendente } = require('../services/atendimentoService');

async function iniciar(client, msg) {
  const instrucoes = `📋 *Cadastro de Cliente*
Por favor, envie as seguintes informações em uma única mensagem, separadas por quebra de linha (Enter):

1️⃣ Nome completo
2️⃣ Nome Fantasia
3️⃣ CNPJ/CPF
4️⃣ Inscrição Estadual
5️⃣ Telefone
6️⃣ CEP`;

  await msg.reply(instrucoes);

  const filter = m => m.from === msg.from;
  const resposta = await client.waitForMessage(filter);
  const dados = resposta.body.trim();

  const linhas = dados.split('\n').map(l => l.trim());

  if (linhas.length < 6 || linhas.some(l => l === '')) {
    await msg.reply('🚫 Dados incompletos ou com campos vazios. Por favor, envie todos os campos solicitados em uma única mensagem. Tente novamente.');
    return;
  }

  const atendenteTel = await getAtendente('cadastro');
  if (!atendenteTel) {
    await msg.reply('Nenhum atendente de cadastro disponível no momento.');
    return;
  }

  const mensagem = `📥 *Novo Cadastro de Cliente:*

👤 Nome completo: ${linhas[0]}
🏷️ Nome Fantasia: ${linhas[1]}
🆔 CNPJ/CPF: ${linhas[2]}
🔖 Inscrição Estadual: ${linhas[3]}
📞 Telefone: ${linhas[4]}
📍 CEP: ${linhas[5]}

👤 Enviado por: ${msg.from}`;

  await client.sendMessage(`${atendenteTel}@c.us`, mensagem).catch(async err => {
    console.error('Erro ao enviar mensagem para atendente cadastro:', err);
    await msg.reply('❌ Ocorreu um erro ao enviar seu cadastro para o atendente. Por favor, tente novamente mais tarde.');
  });

  await msg.reply('✅ Cadastro enviado com sucesso! Obrigado.');
}

module.exports = { iniciar };
