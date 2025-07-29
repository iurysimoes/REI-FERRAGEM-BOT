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

  if (etapa === 'aguardando_numero_pedido_codigo') {
    return controllerPedido.chegou(client, msg); // fluxo "Pedido Chegou"
  }

  if (etapa === 'aguardando_redirecionar_Chegou') {
    return controllerPedido.chegou(client, msg); // fluxo "Pedido Chegou"
  }

  if (etapa === 'acompanhamento' || etapa === 'AGUARDANDO_NUMERO')  {
    return controllerPedido.iniciar(client, msg);
  }

  // if (etapa === 'financeiro_menu') {
  // return controllerFinanceiro.continuar(client, msg);
  // }

//if (etapa?.toLowerCase() === 'financeiro_menu') {
if (etapa === 'financeiro_menu' || etapa === 'financeiro_pos_boleto'){
 //console.log('[router.js] Chamando controllerFinanceiro.continuar');
 return controllerFinanceiro.continuar(client, msg);
}

  if (etapa === 'financeiro_aguardando_nf') {
    return controllerFinanceiro.processarNF(client, msg);
  }

  if (etapa === 'aguardando_dados_cadastro') {
    return controllerCadastro.continuar(client, msg);
    
  }
   // Fluxo Antecipado - passo 1: aguarda arquivo
  if (etapa === 'aguardando_comprovante_antecipado') {
    return controllerAntecipado.continuar(client, msg);
  }
  // 🎯 Gatilhos de entrada (menus principais)

  if (text.includes('pedido chegou')) {
    console.log('chamou pedido chegou');
    //await flowControl.setStep(userId, 'chegou_menu');
    return controllerPedido.chegou(client, msg);
  }

  if (text.includes('pedido')) {
    console.log('chamou pedido ');
    //await setStep(userId, 'acompanhamento');
    await flowControl.clearStep(userId);
    return controllerPedido.iniciar(client, msg);
  }

  if (text.includes('financeiro')) {
    console.log('[router.js] Fluxo financeiro iniciado. Etapa setada para financeiro_menu');
    await flowControl.setStep(userId, 'financeiro_menu');
    return controllerFinanceiro.iniciar(client, msg);
  }
  
  if (text.includes('antecipado')) {
    await flowControl.setStep(userId, 'aguardando_comprovante_antecipado');
    return controllerAntecipado.iniciar(client, msg);
  }
  
  if (text.includes('cadastro cliente')) {
    await flowControl.setStep(userId, 'aguardando_dados_cadastro'); // já define aqui també
    return controllerCadastro.iniciar(client, msg);
  }

  if (text.includes('pós venda') || text.includes('pos venda')) {
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
    '🤖 Olá! Digite uma das palavras-chave \n para iniciar o seu atendimento  \n\n *Pedido* \n *Financeiro* \n *Cadastro Cliente* \n *Antecipado* \n *Pós-Venda* \n *Pedido Chegou* \n *Volume Danificado* \n *Volume Faltou* \n *Outros Assuntos*'
  );
}

module.exports = handleMessage;
