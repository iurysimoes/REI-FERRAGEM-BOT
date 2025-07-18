// back-end/router.js

const controllerPedido = require('./controllers/controllerPedido');
const controllerFinanceiro = require('./controllers/controllerFinanceiro');
const controllerAntecipado = require('./controllers/controllerAntecipado');
const controllerCadastro = require('./controllers/controllerCadastro');
const { redirecionar } = require('./controllers/controllerRedirecionamento');
//const { getStep, setStep } = require('./flowcontrol'); // Corrigido: usar await
const flowControl = require('./flowcontrol');
const NUMERO_FIXO = '556284315872';

async function handleMessage(client, msg) {
  console.log('[router.js] Entrou na função handleMessage');

  if (msg.fromMe) return;
  if (!msg.from.endsWith('@g.us')) return;

  const chat = await msg.getChat();
  if (!chat.isGroup || chat.name !== 'BOT REI') return;

  const userId = msg.author || msg.from;
  const text = msg.body?.toLowerCase().trim() || '';

  const etapa = await flowControl.getStep(userId); // Corrigido: await para funcionar corretamente

  console.log(`Mensagem do grupo "${chat.name}" - Usuário: ${userId} - Texto: "${text}"`);

  // 🔁 Fluxos ativos
  if (etapa?.startsWith('chegou')) {
    return controllerPedido.chegou(client, msg); // fluxo múltiplas etapas do "Pedido Chegou"
  }

  if (etapa === 'acompanhamento' || etapa === 'AGUARDANDO_NUMERO')  {
    return controllerPedido.iniciar(client, msg);
  }

  // 🎯 Gatilhos de entrada (menus principais)

  if (text.includes('pedido chegou')) {
    await flowControl.setStep(userId, 'chegou_menu');
    return controllerPedido.chegou(client, msg);
  }

  if (text.includes('pedido')) {
    //await setStep(userId, 'acompanhamento');
    await flowControl.clearStep(userId);
    return controllerPedido.iniciar(client, msg);
  }

  if (text.includes('financeiro')) {
    return controllerFinanceiro.iniciar(client, msg);
  }

  if (text.includes('antecipado')) {
    return controllerAntecipado.iniciar(client, msg);
  }

  if (text.includes('cadastro cliente')) {
    return controllerCadastro.iniciar(client, msg);
  }

  if (text.includes('pós venda') || text.includes('pós-venda')) {
    return redirecionar(client, msg, 'posvenda', 'Pós-Venda');
  }

  if (text.includes('volume danificado')) {
    return redirecionar(client, msg, 'danificado', 'Volume Danificado');
  }

  if (text.includes('volume faltou')) {
    return redirecionar(client, msg, 'faltou', 'Volume Faltando');
  }

  if (text.includes('outros assuntos')) {
    return redirecionar(client, msg, 'outros', 'Outros Assuntos');
  }

  // Fallback
  await client.sendMessage(
    msg.from,
    '🤖 Olá! Não entendi sua mensagem. Digite uma das palavras-chave como *Pedido*, *Financeiro*, *Cadastro Cliente*, *Antecipado*, *Pós-Venda*, *Volume Danificado*, *Volume Faltou* ou *Outros Assuntos*.'
  );
}

module.exports = handleMessage;
