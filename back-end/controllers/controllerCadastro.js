const flowControl = require('../flowcontrol');
const { getAtendente } = require('../services/atendimentoService');

async function iniciar(client, msg) {
  const user = msg.from;

  const instrucoes = `📋 *Cadastro de Cliente*
Por favor, envie as seguintes informações em uma única mensagem, separadas por quebra de linha (Enter):

1️⃣ Nome completo
2️⃣ Nome Fantasia
3️⃣ CNPJ/CPF
4️⃣ Inscrição Estadual
5️⃣ Telefone
6️⃣ CEP`;

  await client.sendMessage(user, instrucoes);
  await flowControl.setStep(user, 'aguardando_dados_cadastro');
}

async function continuar(client, msg) {
  const user = msg.from;
  //const user = msg.author || msg.from;
  const dados = msg.body.trim();
  const linhas = dados.split('\n').map(l => l.trim());

  if (linhas.length < 6 || linhas.some(l => l === '')) {
    await client.sendMessage(user, '🚫 Dados incompletos ou com campos vazios. Por favor, envie todos os campos solicitados em uma única mensagem. Tente novamente.');
    return;
  }

  const atendenteTel = await getAtendente('cadastro');
  if (!atendenteTel) {
    await client.sendMessage(user, '❌ Nenhum atendente de cadastro disponível no momento.');
    await flowControl.clearStep(user);
    return;
  }

  const mensagem = `📥 *Novo Cadastro de Cliente:*

👤 Nome completo: ${linhas[0]}
🏷️ Nome Fantasia: ${linhas[1]}
🆔 CNPJ/CPF: ${linhas[2]}
🔖 Inscrição Estadual: ${linhas[3]}
📞 Telefone: ${linhas[4]}
📍 CEP: ${linhas[5]}

👤 Enviado por: ${user}`;

  //await client.sendMessage(`${atendenteTel}@c.us`, mensagem);
  const destinatario = `${atendenteTel}@c.us`;
  console.log('Enviando cadastro para:', destinatario);
  console.log('Mensagem:', mensagem);

  await client.sendMessage(destinatario, mensagem).catch(async err => {
    console.error('Erro ao enviar mensagem para atendente cadastro:', err);
    await client.sendMessage(user, '❌ Ocorreu um erro ao enviar seu cadastro para o atendente. Por favor, tente novamente mais tarde.');
  });
  await client.sendMessage(user, '✅ Cadastro enviado com sucesso! Obrigado.');
  console.log(`[controllerCadastro] clearStep antes chamado ${user}`);
  await flowControl.clearStep(user);
  console.log(`[controllerCadastro] clearStep chamado depois ${user}`);
}
 
module.exports = { iniciar, continuar };